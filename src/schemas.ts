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

export const McpStdioServer = z.object({
  type: z.literal("stdio").optional(),
  command: z.string().min(1),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
  cwd: z.string().optional(),
});

export const McpHttpAuth = z.object({
  CLIENT_ID: z.string().min(1),
  CLIENT_SECRET: z.string().optional(),
  scopes: z.array(z.string()).optional(),
});

export const McpHttpServer = z.object({
  type: z.enum(["http", "sse"]).optional(),
  url: z.string().url(),
  headers: z.record(z.string(), z.string()).optional(),
  auth: McpHttpAuth.optional(),
});

export const McpServerConfig = z.union([McpStdioServer, McpHttpServer]);

export const McpServers = z.record(z.string(), McpServerConfig);

export const CreateAgentInput = z.object({
  model: ModelSelection,
  cwd: z.string().min(1),
  mcpServers: McpServers.optional(),
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

export const PollRunOutput = z.discriminatedUnion("status", [
  z.object({
    runId: RunId,
    status: z.literal("running"),
    messages: z.array(z.string()),
  }),
  z.object({
    runId: RunId,
    status: z.literal("finished"),
    messages: z.array(z.string()),
    resultText: z.string(),
  }),
  z.object({
    runId: RunId,
    status: z.enum(["error", "cancelled"]),
    messages: z.array(z.string()),
  }),
]);

export type AgentIdType = z.infer<typeof AgentId>;
export type RunIdType = z.infer<typeof RunId>;
export type RunStatusType = z.infer<typeof RunStatus>;
export type CreateAgentInputType = z.infer<typeof CreateAgentInput>;
export type StartRunInputType = z.infer<typeof StartRunInput>;
export type PollRunOutputType = z.infer<typeof PollRunOutput>;
