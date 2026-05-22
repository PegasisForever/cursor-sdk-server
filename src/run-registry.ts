import type { Run } from "@cursor/sdk";
import type { RunStatusType } from "./schemas.ts";

export interface RunSession {
  runId: string;
  agentId: string;
  sdkRun: Run;
  status: RunStatusType;
  thinkingBuffer: string[];
  deliveredIndex: number;
  resultText?: string;
  terminalAt?: number;
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
