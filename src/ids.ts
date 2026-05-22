import { ulid } from "ulid";

export function generateAgentId(): string {
  return `agt_${ulid()}`;
}

export function generateRunId(): string {
  return `run_${ulid()}`;
}
