import { Agent, CursorAgentError, type McpServerConfig, type ModelSelection, type Run, type SDKMessage } from "@cursor/sdk";
import { TRPCError } from "@trpc/server";
import type { ServerConfig } from "./config.ts";
import { generateAgentId, generateRunId } from "./ids.ts";
import type { Logger } from "./logger.ts";
import { AgentRegistry } from "./agent-registry.ts";
import { RunRegistry, type RunSession } from "./run-registry.ts";
import { toSdkMcpServers, validateMcpServers } from "./mcp.ts";
import type { CreateAgentInputType, PollRunOutputType, RunStatusType } from "./schemas.ts";

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

function appendThinking(
  session: RunSession,
  text: string,
  bufferSize: number,
  logger: Logger,
): void {
  session.thinkingBuffer.push(text);
  if (session.thinkingBuffer.length > bufferSize) {
    const dropped = session.thinkingBuffer.length - bufferSize;
    session.thinkingBuffer.splice(0, dropped);
    logger.warn(
      `Thinking buffer overflow for run ${session.runId}; dropped ${dropped} oldest entries`,
    );
  }
}

async function ingestRun(
  ctx: ServerContext,
  session: RunSession,
): Promise<void> {
  const { logger, config, agents } = ctx;
  const { sdkRun, agentId } = session;

  try {
    for await (const event of sdkRun.stream()) {
      logSdkEvent(logger, session.runId, event);
      if (event.type === "thinking") {
        appendThinking(session, event.text, config.runBufferSize, logger);
      }
      session.status = sdkRun.status as RunStatusType;
    }

    const result = await sdkRun.wait();
    session.status = result.status as RunStatusType;
    if (result.status === "finished") {
      session.resultText = result.result ?? "";
    }
  } catch (error) {
    logger.error(`Run ingestion failed for ${session.runId}`, error);
    if (!isTerminalStatus(session.status)) {
      session.status = "error";
    }
  } finally {
    session.terminalAt = Date.now();
    agents.markInactive(agentId);
  }
}

function logSdkEvent(
  logger: Logger,
  runId: string,
  event: SDKMessage,
): void {
  logger.debug(`SDK event for ${runId}`, event);
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

  if (ctx.agents.isAtCapacity()) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Maximum agent capacity reached",
    });
  }

  try {
    validateMcpServers(input.mcpServers);
  } catch (error) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: error instanceof Error ? error.message : "Invalid MCP config",
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
      mcpServers: toSdkMcpServers(input.mcpServers) as
        | Record<string, McpServerConfig>
        | undefined,
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

  let sdkRun: Run;
  try {
    sdkRun = await record.agent.send(input.prompt);
  } catch (error) {
    if (isCursorAgentError(error)) {
      throw new TRPCError({
        code: "BAD_GATEWAY",
        message: error.message,
      });
    }
    throw error;
  }

  const runId = generateRunId();
  record.hasActiveRun = true;

  const session: RunSession = {
    runId,
    agentId: input.agentId,
    sdkRun,
    status: sdkRun.status as RunStatusType,
    thinkingBuffer: [],
    deliveredIndex: 0,
    backgroundTask: Promise.resolve(),
  };

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

  if (
    session.terminalAt !== undefined &&
    Date.now() - session.terminalAt > ctx.config.runRetentionMs
  ) {
    ctx.runs.delete(input.runId);
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Run evicted after retention: ${input.runId}`,
    });
  }

  const messages = session.thinkingBuffer.slice(session.deliveredIndex);
  session.deliveredIndex = session.thinkingBuffer.length;

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

export function evictExpiredRuns(ctx: ServerContext): void {
  const now = Date.now();
  for (const session of ctx.runs.values()) {
    if (
      session.terminalAt !== undefined &&
      now - session.terminalAt > ctx.config.runRetentionMs
    ) {
      ctx.runs.delete(session.runId);
      ctx.logger.debug(`Evicted run ${session.runId}`);
    }
  }
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
