#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEST_HOME="$(mktemp -d)"
TEST_BIN="${TEST_HOME}/.local/bin"
TEST_SHARE="${TEST_HOME}/share/cursor-sdk-server"
PORT=19500

cleanup() {
  if [ -n "${SERVER_PID:-}" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  rm -rf "$TEST_HOME"
}
trap cleanup EXIT

cd "$ROOT"
bun run build:bundle

export HOME="$TEST_HOME"
export PATH="${TEST_BIN}:${PATH}"
export CURSOR_SDK_SERVER_HOME="$TEST_SHARE"
export CURSOR_SDK_SERVER_BUNDLE="${ROOT}/.release/cursor-sdk-server-linux-x64-$(bun -e "console.log(JSON.parse(await Bun.file('$ROOT/package.json').text()).version)").tar.gz"

mkdir -p "$TEST_BIN"
bash "$ROOT/scripts/install.sh"

if [ ! -x "$TEST_BIN/cursor-sdk-server" ]; then
  echo "error: launcher not created" >&2
  exit 1
fi

if [ -f "$ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

if [ -z "${CURSOR_API_KEY:-}" ]; then
  echo "error: CURSOR_API_KEY is required for install e2e test" >&2
  exit 1
fi

"$TEST_BIN/cursor-sdk-server" --port "$PORT" --host 127.0.0.1 >/tmp/cursor-sdk-install-test.log 2>&1 &
SERVER_PID=$!

for _ in $(seq 1 30); do
  if curl -fsS -o /dev/null -X OPTIONS "http://127.0.0.1:${PORT}/trpc/agent.create" 2>/dev/null; then
    break
  fi
  sleep 0.2
done

cd "$ROOT"
bun -e "
import { createTRPCClient, httpBatchLink, httpLink, splitLink } from '@trpc/client';
import type { AppRouter } from './src/router.ts';

const url = 'http://127.0.0.1:${PORT}/trpc';
const client = createTRPCClient<AppRouter>({
  links: [
    splitLink({
      condition(op) { return op.path === 'run.poll'; },
      true: httpLink({ url }),
      false: httpBatchLink({ url }),
    }),
  ],
});

const agent = await client.agent.create.mutate({
  model: { id: 'composer-2.5' },
  cwd: '$ROOT',
});
const run = await client.run.start.mutate({
  agentId: agent.agentId,
  prompt: 'Reply with exactly the word HELLO and nothing else.',
});

for (let i = 0; i < 120; i++) {
  const poll = await client.run.poll.mutate({ runId: run.runId });
  if (poll.status === 'finished') {
    if (poll.resultText !== 'HELLO') {
      throw new Error('unexpected result: ' + poll.resultText);
    }
    console.log('Install e2e passed:', poll.resultText);
    process.exit(0);
  }
  if (poll.status === 'error' || poll.status === 'cancelled') {
    throw new Error('terminal status: ' + poll.status);
  }
  await Bun.sleep(500);
}
throw new Error('poll timeout');
"

echo "Install test completed successfully"
