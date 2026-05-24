#!/usr/bin/env node
/**
 * End-to-end test: start server, create agent, run, poll until terminal.
 */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { createTRPCClient, httpBatchLink, httpLink, splitLink } from "@trpc/client";
import type { AppRouter } from "../src/router.js";

const PORT = 13847;
const HOST = "127.0.0.1";
const URL = `http://${HOST}:${PORT}/trpc`;
const ROOT = process.cwd();

function makeClient() {
  return createTRPCClient<AppRouter>({
    links: [
      splitLink({
        condition(op) {
          return op.path === "run.poll";
        },
        true: httpLink({ url: URL }),
        false: httpBatchLink({ url: URL }),
      }),
    ],
  });
}

async function waitForServer(maxAttempts = 30): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${URL}/agent.create`, { method: "OPTIONS" });
      if (res.ok || res.status === 204) return;
    } catch {
      // retry
    }
    await sleep(200);
  }
  throw new Error("Server did not become ready");
}

async function main() {
  const server = spawn("node", ["dist/cli.js", "--port", String(PORT), "--host", HOST], {
    cwd: ROOT,
    env: { ...process.env },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let serverOutput = "";
  server.stdout?.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });
  server.stderr?.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });

  const exitPromise = new Promise<number>((resolve) => {
    server.on("exit", (code) => resolve(code ?? 1));
  });

  try {
    await waitForServer();
    console.log("Server ready");

    const client = makeClient();

    const agent = await client.agent.create.mutate({
      model: { id: "composer-2.5" },
      cwd: ROOT,
    });
    console.log("Created agent:", agent.agentId);

    const run = await client.run.start.mutate({
      agentId: agent.agentId,
      prompt: "Reply with exactly the word HELLO and nothing else.",
    });
    console.log("Started run:", run.runId);

    const TERMINAL = new Set(["finished", "error", "cancelled"]);
    let pollCount = 0;
    let finalStatus: string | undefined;

    for (;;) {
      const poll = await client.run.poll.mutate({ runId: run.runId });
      pollCount++;

      for (const message of poll.messages) {
        if (message.content.trim()) {
          console.log(`[${message.eventType}]`, message.content.slice(0, 120));
        }
      }

      if (poll.status === "finished") {
        console.log("Result:", poll.resultText);
        finalStatus = poll.status;
        break;
      }

      if (TERMINAL.has(poll.status)) {
        console.log("Terminal status:", poll.status);
        finalStatus = poll.status;
        break;
      }

      await sleep(500);
      if (pollCount > 120) {
        throw new Error("Poll timeout after 60s");
      }
    }

    if (finalStatus !== "finished") {
      throw new Error(`Expected finished, got ${finalStatus}`);
    }

    console.log("E2E test passed");
  } finally {
    server.kill("SIGTERM");
    await Promise.race([exitPromise, sleep(5000)]);
  }
}

main().catch((err) => {
  console.error("E2E test failed:", err);
  process.exit(1);
});
