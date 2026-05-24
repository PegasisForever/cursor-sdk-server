import { Agent, CursorAgentError, type ModelSelection, type Run } from "@cursor/sdk";
import { TRPCError } from "@trpc/server";
import type { ServerConfig } from "./config.js";
import { generateAgentId, generateRunId } from "./ids.js";
import type { Logger } from "./logger.js";
import { AgentRegistry } from "./agent-registry.js";
import { RunRegistry, type RunSession } from "./run-registry.js";
import { toSdkMcpServers } from "./mcp.js";
import { conversationStepToPollMessage } from "./sdk-events.js";
import type {
  CreateAgentInputType,
  PollMessageType,
  PollRunOutputType,
  RunStatusType,
} from "./schemas.js";

export interface ServerContext {
  apiKey: string;
  config: ServerConfig;
  logger: Logger;
  agents: AgentRegistry;
  runs: RunRegistry;
  shuttingDown: boolean;
}

function isCursorAgentError(error: unknown): error is CursorAgentError {
  return error instanceof CursorAgentError;
}

function isTerminalStatus(status: RunStatusType): boolean {
  return status === "finished" || status === "error" || status === "cancelled";
}

function appendPollMessage(session: RunSession, message: PollMessageType): void {
  session.messageBuffer.push(message);
}

async function ingestRun(
  ctx: ServerContext,
  session: RunSession,
): Promise<void> {
  const { agents } = ctx;
  const { sdkRun, agentId } = session;

  const unsubscribe = sdkRun.onDidChangeStatus((status) => {
    session.status = status as RunStatusType;
  });

  try {
    const result = await sdkRun.wait();
    session.status = result.status as RunStatusType;
    if (result.status === "finished") {
      session.resultText = result.result ?? "";
    }
  } catch (error) {
    ctx.logger.error(`Run ingestion failed for ${session.runId}`, error);
    if (!isTerminalStatus(session.status)) {
      session.status = "error";
    }
  } finally {
    unsubscribe();
    agents.markInactive(agentId);
  }
}

export async function createAgent(
  ctx: ServerContext,
  input: CreateAgentInputType,
): Promise<{ agentId: string }> {
  if (ctx.shuttingDown) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Server is shutting down",
    });
  }

  const agentId = generateAgentId();

  try {
    const agent = await Agent.create({
      apiKey: ctx.apiKey,
      model: input.model as ModelSelection,
      local: {
        cwd: input.cwd,
        settingSources: ["all"],
      },
      mcpServers: toSdkMcpServers(input.mcpServers),
    });

    ctx.agents.set({
      agentId,
      agent,
      config: input,
      hasActiveRun: false,
    });

    ctx.logger.info(`Created agent ${agentId}`, { cwd: input.cwd });
    return { agentId };
  } catch (error) {
    if (isCursorAgentError(error)) {
      throw new TRPCError({
        code: "BAD_GATEWAY",
        message: error.message,
      });
    }
    throw error;
  }
}

export async function startRun(
  ctx: ServerContext,
  input: { agentId: string; prompt: string },
): Promise<{ runId: string; agentId: string }> {
  if (ctx.shuttingDown) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Server is shutting down",
    });
  }

  const record = ctx.agents.get(input.agentId);
  if (!record) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Unknown agent: ${input.agentId}`,
    });
  }

  if (record.hasActiveRun) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Agent already has an active run",
    });
  }

  const runId = generateRunId();
  const sessionHolder: { session?: RunSession } = {};

  let sdkRun: Run;
  try {
    sdkRun = await record.agent.send(input.prompt, {
      onStep({ step }) {
        const session = sessionHolder.session;
        if (!session) {
          return;
        }
        appendPollMessage(session, conversationStepToPollMessage(step));
      },
    });
  } catch (error) {
    if (isCursorAgentError(error)) {
      throw new TRPCError({
        code: "BAD_GATEWAY",
        message: error.message,
      });
    }
    throw error;
  }

  record.hasActiveRun = true;

  const session: RunSession = {
    runId,
    agentId: input.agentId,
    sdkRun,
    status: sdkRun.status as RunStatusType,
    messageBuffer: [],
    deliveredIndex: 0,
    backgroundTask: Promise.resolve(),
  };
  sessionHolder.session = session;

  session.backgroundTask = ingestRun(ctx, session);
  ctx.runs.set(session);

  ctx.logger.info(`Started run ${runId} for agent ${input.agentId}`);
  return { runId, agentId: input.agentId };
}

export function pollRun(
  ctx: ServerContext,
  input: { runId: string },
): PollRunOutputType {
  const session = ctx.runs.get(input.runId);
  if (!session) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Unknown run: ${input.runId}`,
    });
  }

  const messages = session.messageBuffer.slice(session.deliveredIndex);
  session.deliveredIndex = session.messageBuffer.length;

  if (session.status === "finished") {
    return {
      runId: session.runId,
      status: "finished",
      messages,
      resultText: session.resultText ?? "",
    };
  }

  if (session.status === "error" || session.status === "cancelled") {
    return {
      runId: session.runId,
      status: session.status,
      messages,
    };
  }

  return {
    runId: session.runId,
    status: "running",
    messages,
  };
}

export async function shutdownServer(ctx: ServerContext): Promise<void> {
  ctx.shuttingDown = true;
  ctx.logger.info("Shutting down server");

  for (const session of ctx.runs.values()) {
    if (!isTerminalStatus(session.status)) {
      try {
        if (session.sdkRun.supports("cancel")) {
          await session.sdkRun.cancel();
        }
      } catch (error) {
        ctx.logger.warn(`Failed to cancel run ${session.runId}`, error);
      }
    }
  }

  await Promise.allSettled(
    [...ctx.runs.values()].map((session) => session.backgroundTask),
  );

  for (const record of ctx.agents.values()) {
    try {
      await record.agent[Symbol.asyncDispose]();
    } catch (error) {
      ctx.logger.warn(`Failed to dispose agent ${record.agentId}`, error);
    }
  }

  ctx.logger.info("Shutdown complete");
}
