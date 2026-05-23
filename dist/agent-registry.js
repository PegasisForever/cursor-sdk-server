export class AgentRegistry {
    maxAgents;
    agents = new Map();
    constructor(maxAgents) {
        this.maxAgents = maxAgents;
    }
    get size() {
        return this.agents.size;
    }
    get(agentId) {
        return this.agents.get(agentId);
    }
    set(record) {
        this.agents.set(record.agentId, record);
    }
    isAtCapacity() {
        return this.agents.size >= this.maxAgents;
    }
    markActive(agentId) {
        const record = this.agents.get(agentId);
        if (record)
            record.hasActiveRun = true;
    }
    markInactive(agentId) {
        const record = this.agents.get(agentId);
        if (record)
            record.hasActiveRun = false;
    }
    values() {
        return this.agents.values();
    }
}
