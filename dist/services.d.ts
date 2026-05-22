import type { ServerConfig } from "./config.ts";
import type { Logger } from "./logger.ts";
import { AgentRegistry } from "./agent-registry.ts";
import { RunRegistry } from "./run-registry.ts";
import type { CreateAgentInputType, PollRunOutputType } from "./schemas.ts";
export interface ServerContext {
    apiKey: string;
    config: ServerConfig;
    logger: Logger;
    agents: AgentRegistry;
    runs: RunRegistry;
    shuttingDown: boolean;
}
export declare function createAgent(ctx: ServerContext, input: CreateAgentInputType): Promise<{
    agentId: string;
}>;
export declare function startRun(ctx: ServerContext, input: {
    agentId: string;
    prompt: string;
}): Promise<{
    runId: string;
    agentId: string;
}>;
export declare function pollRun(ctx: ServerContext, input: {
    runId: string;
}): PollRunOutputType;
export declare function evictExpiredRuns(ctx: ServerContext): void;
export declare function shutdownServer(ctx: ServerContext): Promise<void>;
//# sourceMappingURL=services.d.ts.map