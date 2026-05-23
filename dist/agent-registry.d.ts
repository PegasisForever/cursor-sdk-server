import type { SDKAgent } from "@cursor/sdk";
import type { CreateAgentInputType } from "./schemas.js";
export interface AgentRecord {
    agentId: string;
    agent: SDKAgent;
    config: CreateAgentInputType;
    hasActiveRun: boolean;
}
export declare class AgentRegistry {
    private readonly maxAgents;
    private readonly agents;
    constructor(maxAgents: number);
    get size(): number;
    get(agentId: string): AgentRecord | undefined;
    set(record: AgentRecord): void;
    isAtCapacity(): boolean;
    markActive(agentId: string): void;
    markInactive(agentId: string): void;
    values(): IterableIterator<AgentRecord>;
}
//# sourceMappingURL=agent-registry.d.ts.map