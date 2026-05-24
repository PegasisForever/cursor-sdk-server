export class AgentRegistry {
    agents = new Map();
    get(agentId) {
        return this.agents.get(agentId);
    }
    set(record) {
        this.agents.set(record.agentId, record);
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
