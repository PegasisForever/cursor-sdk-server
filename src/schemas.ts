import { z } from "zod";

export const AgentId = z.string().uuid();
export const RunId = z.string().uuid();

export const ModelParam = z.object({
  id: z.string(),
  value: z.string(),
});

export const ModelSelection = z.object({
  id: z.string().min(1),
  params: z.array(ModelParam).optional(),
});

export const RunStatus = z.enum([
  "running",
  "finished",
  "error",
  "cancelled",
]);

export const LocalMcpServer = z.object({
  type: z.literal("local"),
  command: z.array(z.string().min(1)).min(1),
  environment: z.record(z.string(), z.string()).optional(),
  timeout: z.number().positive().optional(),
});

export const RemoteMcpServer = z.object({
  type: z.literal("remote"),
  url: z.string().url(),
  headers: z.record(z.string(), z.string()).optional(),
  timeout: z.number().positive().optional(),
});

export const McpServerConfig = z.discriminatedUnion("type", [
  LocalMcpServer,
  RemoteMcpServer,
]);

export const McpServerMap = z.record(z.string(), McpServerConfig);

export const CreateAgentInput = z.object({
  model: ModelSelection,
  cwd: z.string().min(1),
  mcpServers: McpServerMap.optional(),
});

export const CreateAgentOutput = z.object({
  agentId: AgentId,
});

export const StartRunInput = z.object({
  agentId: AgentId,
  prompt: z.string().min(1),
});

export const StartRunOutput = z.object({
  runId: RunId,
  agentId: AgentId,
});

export const PollRunInput = z.object({
  runId: RunId,
});

export const EventType = z.enum(["assistant", "tool_call", "thinking"]);

export const PollMessage = z.object({
  eventType: EventType,
  content: z.string(),
});

export const PollRunOutput = z.discriminatedUnion("status", [
  z.object({
    runId: RunId,
    status: z.literal("running"),
    messages: z.array(PollMessage),
  }),
  z.object({
    runId: RunId,
    status: z.literal("finished"),
    messages: z.array(PollMessage),
    resultText: z.string(),
  }),
  z.object({
    runId: RunId,
    status: z.enum(["error", "cancelled"]),
    messages: z.array(PollMessage),
  }),
]);

export type AgentIdType = z.infer<typeof AgentId>;
export type RunIdType = z.infer<typeof RunId>;
export type RunStatusType = z.infer<typeof RunStatus>;
export type CreateAgentInputType = z.infer<typeof CreateAgentInput>;
export type StartRunInputType = z.infer<typeof StartRunInput>;
export type EventTypeType = z.infer<typeof EventType>;
export type PollMessageType = z.infer<typeof PollMessage>;
export type PollRunOutputType = z.infer<typeof PollRunOutput>;
