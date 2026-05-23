import { createTRPCClient, httpBatchLink, httpLink, splitLink } from "@trpc/client";
import type { AppRouter } from "../src/router.js";

const port = process.env.CURSOR_SDK_SERVER_TEST_PORT;
const cwd = process.env.CURSOR_SDK_SERVER_TEST_CWD;
if (!port || !cwd) {
  throw new Error("CURSOR_SDK_SERVER_TEST_PORT and CURSOR_SDK_SERVER_TEST_CWD are required");
}

const url = `http://127.0.0.1:${port}/trpc`;
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

const agent = await client.agent.create.mutate({
  model: { id: "composer-2.5" },
  cwd,
});
const run = await client.run.start.mutate({
  agentId: agent.agentId,
  prompt: "Reply with exactly the word HELLO and nothing else.",
});

for (let i = 0; i < 120; i++) {
  const poll = await client.run.poll.mutate({ runId: run.runId });
  if (poll.status === "finished") {
    if (poll.resultText !== "HELLO") {
      throw new Error(`unexpected result: ${poll.resultText}`);
    }
    console.log("Install e2e passed:", poll.resultText);
    process.exit(0);
  }
  if (poll.status === "error" || poll.status === "cancelled") {
    throw new Error(`terminal status: ${poll.status}`);
  }
  await new Promise((r) => setTimeout(r, 500));
}

throw new Error("poll timeout");
