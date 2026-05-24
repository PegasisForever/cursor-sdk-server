import type { Run } from "@cursor/sdk";
import type { PollMessageType, RunStatusType } from "./schemas.js";
export interface RunSession {
    runId: string;
    agentId: string;
    sdkRun: Run;
    status: RunStatusType;
    messageBuffer: PollMessageType[];
    deliveredIndex: number;
    resultText?: string;
    backgroundTask: Promise<void>;
}
export declare class RunRegistry {
    private readonly runs;
    get(runId: string): RunSession | undefined;
    set(session: RunSession): void;
    delete(runId: string): void;
    values(): IterableIterator<RunSession>;
}
//# sourceMappingURL=run-registry.d.ts.map