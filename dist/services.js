import { Agent, CursorAgentError } from "@cursor/sdk";
import { TRPCError } from "@trpc/server";
import { generateAgentId, generateRunId } from "./ids.js";
import { toSdkMcpServers } from "./mcp.js";
import { conversationStepToPollMessage } from "./sdk-events.js";
function isCursorAgentError(error) {
    return error instanceof CursorAgentError;
}
function isTerminalStatus(status) {
    return status === "finished" || status === "error" || status === "cancelled";
}
function appendPollMessage(session, message) {
    session.messageBuffer.push(message);
}
async function ingestRun(ctx, session) {
    const { agents } = ctx;
    const { sdkRun, agentId } = session;
    const unsubscribe = sdkRun.onDidChangeStatus((status) => {
        session.status = status;
    });
    try {
        const result = await sdkRun.wait();
        session.status = result.status;
        if (result.status === "finished") {
            session.resultText = result.result ?? "";
        }
    }
    catch (error) {
        ctx.logger.error(`Run ingestion failed for ${session.runId}`, error);
        if (!isTerminalStatus(session.status)) {
            session.status = "error";
        }
    }
    finally {
        unsubscribe();
        agents.markInactive(agentId);
    }
}
export async function createAgent(ctx, input) {
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
            model: input.model,
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
    }
    catch (error) {
        if (isCursorAgentError(error)) {
            throw new TRPCError({
                code: "BAD_GATEWAY",
                message: error.message,
            });
        }
        throw error;
    }
}
export async function startRun(ctx, input) {
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
    const sessionHolder = {};
    let sdkRun;
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
    }
    catch (error) {
        if (isCursorAgentError(error)) {
            throw new TRPCError({
                code: "BAD_GATEWAY",
                message: error.message,
            });
        }
        throw error;
    }
    record.hasActiveRun = true;
    const session = {
        runId,
        agentId: input.agentId,
        sdkRun,
        status: sdkRun.status,
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
export function pollRun(ctx, input) {
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
export async function shutdownServer(ctx) {
    ctx.shuttingDown = true;
    ctx.logger.info("Shutting down server");
    for (const session of ctx.runs.values()) {
        if (!isTerminalStatus(session.status)) {
            try {
                if (session.sdkRun.supports("cancel")) {
                    await session.sdkRun.cancel();
                }
            }
            catch (error) {
                ctx.logger.warn(`Failed to cancel run ${session.runId}`, error);
            }
        }
    }
    await Promise.allSettled([...ctx.runs.values()].map((session) => session.backgroundTask));
    for (const record of ctx.agents.values()) {
        try {
            await record.agent[Symbol.asyncDispose]();
        }
        catch (error) {
            ctx.logger.warn(`Failed to dispose agent ${record.agentId}`, error);
        }
    }
    ctx.logger.info("Shutdown complete");
}
