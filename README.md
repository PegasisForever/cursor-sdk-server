# cursor-sdk-server

Bun-based HTTP server that wraps the [Cursor TypeScript SDK](https://cursor.com/docs/sdk/typescript) (`@cursor/sdk`) with a [tRPC](https://trpc.io) + [Zod](https://zod.dev) API. Create local agents, start runs, and poll for thinking-only progress messages.

See [SPEC.md](./SPEC.md) for the full API specification.

## Requirements

- [Bun](https://bun.sh) >= 1.0
- `CURSOR_API_KEY` environment variable ([Cursor Dashboard → Integrations](https://cursor.com/dashboard/integrations))

## Quick start

```bash
export CURSOR_API_KEY="cursor_..."
bun install
bun run dev
# cursor-sdk-server listening on http://127.0.0.1:3847/trpc
```

### CLI flags

| Flag | Env var | Default | Description |
|------|---------|---------|-------------|
| `--port` | `CURSOR_SDK_SERVER_PORT` | `3847` | HTTP listen port |
| `--host` | `CURSOR_SDK_SERVER_HOST` | `127.0.0.1` | Bind address |
| `--max-agents` | `CURSOR_SDK_SERVER_MAX_AGENTS` | `50` | Max concurrent agents |
| `--run-retention` | `CURSOR_SDK_SERVER_RUN_RETENTION` | `1h` | Terminal run retention |
| `--run-buffer-size` | `CURSOR_SDK_SERVER_RUN_BUFFER_SIZE` | `10000` | Max thinking strings per run |
| `--log-level` | `CURSOR_SDK_SERVER_LOG_LEVEL` | `info` | `debug` \| `info` \| `warn` \| `error` |

## Install (Linux x64)

Requires [Bun](https://bun.sh) >= 1.0. Downloads the release bundle, installs dependencies, and adds `cursor-sdk-server` to `~/.local/bin/`.

```bash
curl -fsSL https://raw.githubusercontent.com/PegasisForever/cursor-sdk-server/main/scripts/install.sh | bash
```

Install a specific version:

```bash
curl -fsSL https://raw.githubusercontent.com/PegasisForever/cursor-sdk-server/main/scripts/install.sh | bash -s -- 0.3.0
```

Then run:

```bash
export CURSOR_API_KEY="cursor_..."
cursor-sdk-server
# cursor-sdk-server listening on http://127.0.0.1:3847/trpc
```

The app is installed to `~/.local/share/cursor-sdk-server`. Override with `CURSOR_SDK_SERVER_HOME`.

Ensure `~/.local/bin` is in your `PATH`.

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

  for (const text of poll.messages) {
    console.log("[thinking]", text);
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
| `run.poll` | mutation | Fetch unread thinking text |

## Development

```bash
bun install
bun run dev          # start server from source
bun run build        # build dist + type declarations
bun run build:bundle # create release tarball in .release/
bun run test:install # test install script + e2e (requires CURSOR_API_KEY)
bun run test:e2e     # end-to-end test (requires CURSOR_API_KEY)
```

## License

MIT
