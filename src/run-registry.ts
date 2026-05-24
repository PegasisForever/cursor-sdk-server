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

export class RunRegistry {
  private readonly runs = new Map<string, RunSession>();

  get(runId: string): RunSession | undefined {
    return this.runs.get(runId);
  }

  set(session: RunSession): void {
    this.runs.set(session.runId, session);
  }

  delete(runId: string): void {
    this.runs.delete(runId);
  }

  values(): IterableIterator<RunSession> {
    return this.runs.values();
  }
}
