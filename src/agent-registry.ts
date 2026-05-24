import type { SDKAgent } from "@cursor/sdk";
import type { CreateAgentInputType } from "./schemas.js";

export interface AgentRecord {
  agentId: string;
  agent: SDKAgent;
  config: CreateAgentInputType;
  hasActiveRun: boolean;
}

export class AgentRegistry {
  private readonly agents = new Map<string, AgentRecord>();

  get(agentId: string): AgentRecord | undefined {
    return this.agents.get(agentId);
  }

  set(record: AgentRecord): void {
    this.agents.set(record.agentId, record);
  }

  markInactive(agentId: string): void {
    const record = this.agents.get(agentId);
    if (record) record.hasActiveRun = false;
  }

  values(): IterableIterator<AgentRecord> {
    return this.agents.values();
  }
}
