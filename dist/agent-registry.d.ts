import type { SDKAgent } from "@cursor/sdk";
import type { CreateAgentInputType } from "./schemas.js";
export interface AgentRecord {
    agentId: string;
    agent: SDKAgent;
    config: CreateAgentInputType;
    hasActiveRun: boolean;
}
export declare class AgentRegistry {
    private readonly agents;
    get(agentId: string): AgentRecord | undefined;
    set(record: AgentRecord): void;
    markInactive(agentId: string): void;
    values(): IterableIterator<AgentRecord>;
}
//# sourceMappingURL=agent-registry.d.ts.map