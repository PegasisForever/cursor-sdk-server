# cursor-sdk-server — API Specification

A Node.js HTTP server that wraps the [Cursor TypeScript SDK](https://cursor.com/docs/sdk/typescript) (`@cursor/sdk`). The API is defined with [tRPC](https://trpc.io) and [Zod](https://zod.dev). Clients create local agents, start runs, and poll for unread progress messages. The server manages multiple concurrent agents in-process; clients do not authenticate to the server.

---

## CLI

```bash
export CURSOR_API_KEY="cursor_..."
npm run dev
# or, once installed:
cursor-sdk-server [options]
```

The server **requires** `CURSOR_API_KEY` in the environment. It exits with a non-zero status at startup if the variable is unset.


| Flag           | Env var                        | Default     | Description                                 |
| -------------- | ------------------------------ | ----------- | ------------------------------------------- |
| `--port`       | `CURSOR_SDK_SERVER_PORT`       | `3847`      | HTTP listen port                            |
| `--host`       | `CURSOR_SDK_SERVER_HOST`       | `127.0.0.1` | Bind address                                |
| `--log-level`  | `CURSOR_SDK_SERVER_LOG_LEVEL`  | `info`      | `debug` \| `info` \| `warn` \| `error`         |


On startup the server prints:

```
cursor-sdk-server listening on http://127.0.0.1:3847/trpc
```

---

## Design principles

1. **No client auth** — any client that can reach the bind address may call the API. Deploy behind a firewall or reverse proxy if needed.
2. **Server-owned Cursor credentials** — `CURSOR_API_KEY` is read from the environment at startup; never exposed to clients.
3. **Local runtime only** — agents run on the host machine against a caller-supplied working directory.
4. **tRPC + Zod** — all inputs and outputs are validated with Zod; the router is the source of truth for the wire contract.
5. **Polling, not streaming** — progress is fetched with repeated `run.poll` calls. No SSE or WebSocket.
6. **Single poller per run** — exactly one client is expected to poll a given `runId`. The server tracks a per-run `deliveredIndex`; concurrent pollers on the same run are unsupported and behavior is undefined.
7. **Step-based poll surface** — clients receive unread conversation steps via `run.poll` as `{ eventType, content }` messages (`assistant`, `thinking`, `tool_call`). Steps come from SDK `onStep` during `agent.send()`.
8. **One active run per agent** — at most one non-terminal run per `agentId`. A second `run.start` while a run is active returns `PRECONDITION_FAILED`.

---

## Transport

tRPC is served over HTTP at:

```
http://{host}:{port}/trpc
```

Use `@trpc/client` with `httpBatchLink` or `httpLink` against that URL. No auth headers.

Use `httpBatchLink` for `agent.create` and `run.start`. Use `httpLink` (not batch) for the `run.poll` loop — `run.poll` is a mutation that advances server state and must not be retried or batched.

Example client setup:

```typescript
import { createTRPCClient, httpBatchLink, httpLink, splitLink } from "@trpc/client";
import type { AppRouter } from "cursor-sdk-server/router";

const url = "http://127.0.0.1:3847/trpc";

const client = createTRPCClient<AppRouter>({
  links: [
    splitLink({
      condition(op) {
        return op.path === "run.poll";
      },
      true: httpLink({ url }),
      false: httpBatchLink({ url }),
    }),
  ],
});
```

---

## Router

```typescript
export const appRouter = router({
  agent: router({
    create: publicProcedure
      .input(CreateAgentInput)
      .output(CreateAgentOutput)
      .mutation(/* ... */),
  }),
  run: router({
    start: publicProcedure
      .input(StartRunInput)
      .output(StartRunOutput)
      .mutation(/* ... */),
    poll: publicProcedure
      .input(PollRunInput)
      .output(PollRunOutput)
      .mutation(/* ... */),
  }),
});

export type AppRouter = typeof appRouter;
```

| Procedure      | Type     | Description                                              |
| -------------- | -------- | -------------------------------------------------------- |
| `agent.create` | mutation | Create a local agent                                     |
| `run.start`    | mutation | Send a prompt; returns `runId`                           |
| `run.poll`     | mutation | Fetch unread conversation step messages; advances `deliveredIndex`     |

`run.poll` is a mutation (not a query) because each call advances the per-run `deliveredIndex`. Clients must not retry polls automatically.

---

## Errors

Procedures throw `TRPCError`. v0.1 exposes only the tRPC code and `error.message` — no structured error payload beyond that.

### Global codes

| tRPC code               | When                                              |
| ----------------------- | ------------------------------------------------- |
| `BAD_REQUEST`           | Zod validation failure or invalid field values      |
| `NOT_FOUND`             | Unknown `agentId` / `runId`            |
| `PRECONDITION_FAILED`   | Operation rejected due to agent/run state         |
| `INTERNAL_SERVER_ERROR` | Unexpected server failure                         |
| `BAD_GATEWAY`           | `CursorAgentError` from `@cursor/sdk` before a run is registered |

`BAD_GATEWAY` applies to `CursorAgentError` thrown by `Agent.create()` or the synchronous portion of `agent.send()` during `run.start`. Failures after a run is registered surface as poll `status: "error"`, not thrown errors.

### Per-procedure errors

| Procedure      | Code                  | When |
| -------------- | --------------------- | ---- |
| `agent.create` | `BAD_GATEWAY`         | SDK agent creation failed |
| `agent.create` | `BAD_REQUEST`         | Invalid MCP config (Zod validation failure) |
| `run.start`    | `NOT_FOUND`           | Unknown `agentId` |
| `run.start`    | `PRECONDITION_FAILED` | Agent already has a non-terminal run |
| `run.start`    | `BAD_GATEWAY`         | `agent.send()` failed before run registration |
| `run.poll`     | `NOT_FOUND`           | Unknown `runId` |

---

## Shared schemas (Zod)

Schemas live in a shared module (e.g. `src/schemas.ts`) imported by both server and client.

### Primitives

```typescript
import { z } from "zod";

export const AgentId = z.string().uuid();
export const RunId = z.string().uuid();

export const ModelParam = z.object({
  id: z.string(),
  value: z.string(),
});

export const ModelSelection = z.object({
  id: z.string().min(1),
  params: z.array(ModelParam).optional(), // opaque passthrough to SDK; see Cursor.models.list()
});

export const RunStatus = z.enum([
  "running",
  "finished",
  "error",
  "cancelled",
]); // mirrors SDK `run.status` / `RunResult.status`
```

### MCP

```typescript
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
```

The server translates wire configs to Cursor SDK format before `Agent.create()`:

| Wire (`type`) | SDK |
| ------------- | --- |
| `local` | `{ type: "stdio", command, args?, env? }` — `command[0]` is the executable, remaining entries are args; `environment` → `env` |
| `remote` | `{ type: "http", url, headers? }` |

`timeout` is accepted on the wire but not passed to the SDK (unsupported there).

---

## Procedures

### `agent.create`

Create a durable local agent. The server holds the SDK `Agent` handle for the lifetime of the server process.

```typescript
export const CreateAgentInput = z.object({
  model: ModelSelection,
  cwd: z.string().min(1),
  mcpServers: McpServerMap.optional(),
});

export const CreateAgentOutput = z.object({
  agentId: AgentId,
});
```

**Example**

```typescript
const agent = await client.agent.create.mutate({
  model: { id: "composer-2.5" },
  cwd: "/workspaces/my-repo",
  mcpServers: {
    github: {
      type: "local",
      command: ["npx", "-y", "@modelcontextprotocol/server-github"],
      environment: { GITHUB_TOKEN: process.env.GITHUB_TOKEN! },
    },
  },
});
// agent.agentId → "550e8400-e29b-41d4-a716-446655440000"
```


| Field        | Required | Notes                                 |
| ------------ | -------- | ------------------------------------- |
| `model`      | yes      | Model ID and optional params          |
| `cwd`        | yes      | Working directory for the local agent |
| `mcpServers` | no       | Inline MCP definitions; remembered for all runs on this agent |

The server always passes `local: { settingSources: ["all"] }` to the SDK. Clients cannot override this — agents load project, user, team, MDM, and plugin settings from the host environment in addition to inline `mcpServers`.

---

### `run.start`

Send a prompt to an agent. On success, returns a `runId` immediately and begins ingesting the SDK run in the background. The client polls `run.poll` for progress.

**Concurrency:** at most one non-terminal run per `agentId`. If the agent already has a run with SDK status `running`, return `PRECONDITION_FAILED`.

**Failure before registration:** the server allocates a `runId` only after `agent.send(prompt)` succeeds. If `send()` throws `CursorAgentError`, the client receives `BAD_GATEWAY` and no `runId` is created.

```typescript
export const StartRunInput = z.object({
  agentId: AgentId,
  prompt: z.string().min(1),
});

export const StartRunOutput = z.object({
  runId: RunId,
  agentId: AgentId,
});
```

**Example**

```typescript
const run = await client.run.start.mutate({
  agentId: agent.agentId,
  prompt: "Find the auth bug in src/auth.ts and fix it",
});
// run.runId → "f47ac10b-58cc-4372-a567-0e02b2c3d479"
```

| Field     | Required | Notes             |
| --------- | -------- | ----------------- |
| `agentId` | yes      | Target agent      |
| `prompt`  | yes      | User message text |

MCP servers configured at `agent.create` are reused for every run on that agent. Per-run MCP overrides are not supported.

---

### `run.poll`

Return unread conversation step messages not yet delivered to the client for this run. When the run finishes, include `resultText`.

**Single-poller contract:** the server maintains one `deliveredIndex` per `runId`. Each successful poll advances `deliveredIndex` through all returned messages. A second concurrent poller on the same run has undefined behavior — do not do this. Do not retry failed poll requests automatically.

**Poll interval:** clients should poll at ≥ 500 ms. The server does not rate-limit polls in v0.1.

**Terminal re-poll:** after a run reaches a terminal state, further polls on the same `runId` return empty `messages`, stable `status`, and the same `resultText` (if `finished`). `deliveredIndex` does not regress. Run sessions are kept in memory until server shutdown.

```typescript
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
    resultText: z.string(), // may be "" if SDK returned no final text
  }),
  z.object({
    runId: RunId,
    status: z.enum(["error", "cancelled"]),
    messages: z.array(PollMessage),
  }),
]);
```

**Example — poll loop**

```typescript
const TERMINAL = new Set(["finished", "error", "cancelled"]);

for (;;) {
  const poll = await client.run.poll.mutate({ runId: run.runId });

  for (const message of poll.messages) {
    console.log(`[${message.eventType}]`, message.content);
  }

  if (poll.status === "finished") {
    console.log("done:", poll.resultText);
    break;
  }

  if (TERMINAL.has(poll.status)) {
    break;
  }

  await new Promise((r) => setTimeout(r, 500));
}
```

**Semantics**

| Field        | Description |
| ------------ | ----------- |
| `messages`   | Unread conversation steps since the last poll, in arrival order. Each entry has `eventType` (`assistant` \| `thinking` \| `tool_call`) and human-readable `content`. Empty array if nothing new. |
| `status`     | SDK run status — mirrored from `run.status`. See [Run status](#run-status). |
| `resultText` | Present only when `status` is `finished`. Set from `run.wait()` → `RunResult.result`. May be `""` if the SDK returned no text. |

**`content` encoding by `eventType`**

| `eventType`   | `content` |
| ------------- | --------- |
| `assistant`   | Full assistant reply text for the step |
| `thinking`    | Thinking text; appends `(Nms)` when duration is set |
| `tool_call`   | Tool name, then indented `Args:` / `Result:` sections |

**Example response (in progress)**

```json
{
  "runId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "status": "running",
  "messages": [
    {
      "eventType": "thinking",
      "content": "Let me inspect the auth module first..."
    },
    {
      "eventType": "tool_call",
      "content": "read\nArgs:\n  path: src/auth.ts"
    }
  ]
}
```

**Example response (finished)**

```json
{
  "runId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "status": "finished",
  "messages": [
    {
      "eventType": "thinking",
      "content": "The issue is a missing null check before token validation."
    },
    {
      "eventType": "assistant",
      "content": "Fixed the null check in auth.ts."
    }
  ],
  "resultText": "Fixed the null check in auth.ts."
}
```

---

## Run lifecycle (server-internal)

Each successful `run.start` creates a `RunSession` and spawns a background task:

1. **Register** — allocate `runId`, call `agent.send(prompt, { onStep })`, hold the SDK `Run` handle. Each `onStep` callback appends a poll message.
2. **Wait** — background task calls `await run.wait()`. Subscribe to `run.onDidChangeStatus()` to keep poll `status` in sync while waiting.
3. **Finalize** — set poll `status` and `resultText` (if `finished`) from `RunResult`.
4. **Release agent slot** — mark the agent as eligible for a new `run.start`.

If the server shuts down during step 2 or 3, cancel in-flight SDK runs; poll `status` mirrors the resulting SDK status (typically `"cancelled"`).

---

## Run status

Poll `status` is the SDK run status — no custom wire values. Use the same strings as `run.status` and `RunResult.status` from `@cursor/sdk`:

| SDK `status` | Meaning |
| ------------ | ------- |
| `running`    | Run in progress (`run.status` before `wait()` completes) |
| `finished`   | `run.wait()` returned `status: "finished"` |
| `error`      | `run.wait()` returned `status: "error"` |
| `cancelled`  | `run.wait()` returned `status: "cancelled"`, or run was cancelled during server shutdown |

The server updates poll `status` via `run.onDidChangeStatus()` while waiting and from `RunResult.status` after `run.wait()`.

---

## Concurrency model

```
┌─────────────┐   agent.create      ┌──────────────────┐
│   Client    │ ──────────────────► │  AgentRegistry   │
│             │                     │  Map<agentId,    │
│             │   run.start         │   SDKAgent>      │
│             │ ──────────────────► │                  │
│             │                     │  RunRegistry     │
│             │   run.poll (loop)   │  Map<runId,      │
│             │ ◄────────────────── │   RunSession>    │
└─────────────┘                     └──────────────────┘
                                           │
                                    deliveredIndex per run
                                    (single poller, onStep only)
```

- **Agents** — one SDK `Agent` per `agentId`. At most one non-terminal run per agent.
- **Runs** — one SDK `Run` per `runId`. Each run owns a message buffer and a `deliveredIndex`.
- **Polling** — each `run.poll` returns unread conversation step messages, then advances `deliveredIndex`. No fan-out. Polls are mutations — do not retry.
- **Cleanup** — agents are disposed on server shutdown; in-flight runs become `cancelled`. Run sessions remain pollable until shutdown.

---

## Example session

```typescript
import { createTRPCClient, httpBatchLink, httpLink, splitLink } from "@trpc/client";
import type { AppRouter } from "cursor-sdk-server/router";

const url = "http://127.0.0.1:3847/trpc";

const client = createTRPCClient<AppRouter>({
  links: [
    splitLink({
      condition(op) {
        return op.path === "run.poll";
      },
      true: httpLink({ url }),
      false: httpBatchLink({ url }),
    }),
  ],
});

// 1. Create agent
const agent = await client.agent.create.mutate({
  model: { id: "composer-2.5" },
  cwd: "/workspaces/my-repo",
  mcpServers: {
    github: {
      type: "local",
      command: ["npx", "-y", "@modelcontextprotocol/server-github"],
      environment: { GITHUB_TOKEN: process.env.GITHUB_TOKEN! },
    },
  },
});

// 2. Start run
const run = await client.run.start.mutate({
  agentId: agent.agentId,
  prompt: "List open PRs and summarize the oldest",
});

// 3. Poll until terminal
const TERMINAL = new Set(["finished", "error", "cancelled"]);

for (;;) {
  const poll = await client.run.poll.mutate({ runId: run.runId });

  for (const message of poll.messages) {
    console.log(`[${message.eventType}]`, message.content);
  }

  if (poll.status === "finished") {
    console.log("done:", poll.resultText);
    break;
  }

  if (TERMINAL.has(poll.status)) {
    break;
  }

  await new Promise((r) => setTimeout(r, 500));
}
```

---

## Implementation notes (non-normative)


| Concern           | Approach                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| HTTP server       | `node:http` + `@trpc/server/adapters/standalone`                                                        |
| Schema module     | `src/schemas.ts` — export Zod schemas and inferred TS types                                             |
| Router module     | `src/router.ts` — export `appRouter` and `AppRouter`                                                    |
| ID generation     | UUID v4 via `crypto.randomUUID()`                                                                       |
| SDK credentials   | Read `process.env.CURSOR_API_KEY`; fail fast if missing                                                 |
| Setting sources   | Always `local: { settingSources: ["all"] }` on `Agent.create()` — not exposed via API                   |
| Event ingestion   | Background task per run: `onStep` → buffer poll messages; `run.wait()` → set terminal status and `resultText` |
| SDK disposal      | `await agent[Symbol.asyncDispose]()` on server shutdown |
| Graceful shutdown | `SIGINT`/`SIGTERM` → stop accepting requests → cancel in-flight SDK runs → dispose all agents → exit |
| Message buffer    | In-memory array per run; unbounded |
| Run sessions      | Kept in memory until server shutdown |
| CORS              | Enabled (`Access-Control-Allow-Origin: *`) since there is no auth |


### Server shutdown

On `SIGINT` / `SIGTERM`:

1. Stop accepting new tRPC requests.
2. Cancel in-flight SDK runs (poll `status` → `"cancelled"` via SDK).
3. Dispose all agents.
4. Exit 0.

In-flight `run.poll` calls during shutdown may return the last known state or fail with a connection error; clients should treat connection loss as terminal.

---

## Future extensions (out of scope v0.1)

- `agent.delete` for explicit agent disposal
- `run.cancel` for run cancellation
- `agent.list`, `agent.get`, `health`, `models` procedures
- Cloud runtime support
- Multi-poller fan-out or client-supplied `afterSeq` cursors
- SSE / WebSocket streaming transport
- Persistent agent storage / `Agent.resume()` across server restarts
- Per-client API keys or mTLS

