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
npm run build:bundle

export HOME="$TEST_HOME"
ORIG_PATH="$PATH"
export CURSOR_SDK_SERVER_HOME="$TEST_SHARE"
export CURSOR_SDK_SERVER_BUNDLE="${ROOT}/.release/cursor-sdk-server-linux-x64-$(node -p "require('${ROOT}/package.json').version").tar.gz"

mkdir -p "$TEST_BIN"

# Install should not depend on a system Node/npm on PATH.
PATH="/usr/bin:/bin" bash "$ROOT/scripts/install.sh"

if [ ! -x "$TEST_SHARE/node/bin/node" ]; then
  echo "error: portable node not installed" >&2
  exit 1
fi

if [ ! -x "$TEST_BIN/cursor-sdk-server" ]; then
  echo "error: launcher not created" >&2
  exit 1
fi

export PATH="${TEST_BIN}:${ORIG_PATH}"

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
CURSOR_SDK_SERVER_TEST_PORT="$PORT" CURSOR_SDK_SERVER_TEST_CWD="$ROOT" tsx scripts/install-e2e-client.ts

echo "Install test completed successfully"
