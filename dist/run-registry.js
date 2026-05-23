export class RunRegistry {
    runs = new Map();
    get(runId) {
        return this.runs.get(runId);
    }
    set(session) {
        this.runs.set(session.runId, session);
    }
    delete(runId) {
        this.runs.delete(runId);
    }
    values() {
        return this.runs.values();
    }
}
