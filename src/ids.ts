export function generateAgentId(): string {
  return crypto.randomUUID();
}

export function generateRunId(): string {
  return crypto.randomUUID();
}
