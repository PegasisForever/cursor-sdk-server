# cursor-sdk-server

Node.js HTTP server that wraps the [Cursor TypeScript SDK](https://cursor.com/docs/sdk/typescript) (`@cursor/sdk`) with a [tRPC](https://trpc.io) + [Zod](https://zod.dev) API. Create local agents, start runs, and poll for conversation step progress messages.

See [SPEC.md](./SPEC.md) for the full API specification.

## Requirements

- [Node.js](https://nodejs.org) >= 24 (for development)
- `CURSOR_API_KEY` environment variable ([Cursor Dashboard → Integrations](https://cursor.com/dashboard/integrations))

## Quick start

```bash
export CURSOR_API_KEY="cursor_..."
npm install
npm run dev
# cursor-sdk-server listening on http://127.0.0.1:3847/trpc
```

### CLI flags

| Flag | Env var | Default | Description |
|------|---------|---------|-------------|
| `--port` | `CURSOR_SDK_SERVER_PORT` | `3847` | HTTP listen port |
| `--host` | `CURSOR_SDK_SERVER_HOST` | `127.0.0.1` | Bind address |
| `--log-level` | `CURSOR_SDK_SERVER_LOG_LEVEL` | `info` | `debug` \| `info` \| `warn` \| `error` |

## Install (Linux x64)

Downloads a portable Node.js 24 runtime (kept inside the install directory, not added to your PATH), the release bundle, app dependencies, and a `cursor-sdk-server` launcher in `~/.local/bin/`.

Requires `curl` and `tar` only.

```bash
curl -fsSL https://raw.githubusercontent.com/PegasisForever/cursor-sdk-server/main/scripts/install.sh | bash
```

Install a specific version:

```bash
curl -fsSL https://raw.githubusercontent.com/PegasisForever/cursor-sdk-server/main/scripts/install.sh | bash -s -- 0.5.1
```

Then run:

```bash
export CURSOR_API_KEY="cursor_..."
cursor-sdk-server
# cursor-sdk-server listening on http://127.0.0.1:3847/trpc
```

The app is installed to `~/.local/share/cursor-sdk-server` (including a private Node.js at `~/.local/share/cursor-sdk-server/node/bin/node`). Override the install dir with `CURSOR_SDK_SERVER_HOME`. Override the Node version with `CURSOR_SDK_SERVER_NODE_VERSION` (default `24.14.0`).

Ensure `~/.local/bin` is in your PATH.

## Client usage (git dependency + tRPC types)

Add as a dependency via git URL so you get the exported `AppRouter` type:

```json
{
  "dependencies": {
    "@trpc/client": "^11.1.0",
    "cursor-sdk-server": "github:PegasisForever/cursor-sdk-server"
  }
}
```

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
});

// 2. Start run
const run = await client.run.start.mutate({
  agentId: agent.agentId,
  prompt: "Find the auth bug in src/auth.ts and fix it",
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

Use `httpBatchLink` for `agent.create` and `run.start`. Use `httpLink` (not batch) for the `run.poll` loop — each poll advances server state and must not be retried or batched.

A runnable example lives in [`examples/client/`](./examples/client/).

## API overview

| Procedure | Type | Description |
|-----------|------|-------------|
| `agent.create` | mutation | Create a local agent |
| `run.start` | mutation | Send a prompt; returns `runId` |
| `run.poll` | mutation | Fetch unread conversation step messages |

## Development

```bash
npm install
npm run dev          # start server from source (tsx watch)
npm run build        # compile dist + type declarations
npm run build:bundle # create release tarball in .release/
npm run test:install # test install script + e2e (requires CURSOR_API_KEY)
npm run test:e2e     # end-to-end test (requires CURSOR_API_KEY)
```

## License

MIT
