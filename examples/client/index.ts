import { createTRPCClient, httpBatchLink, httpLink, splitLink } from "@trpc/client";
import type { AppRouter } from "cursor-sdk-server/router";

const url = process.env.CURSOR_SDK_SERVER_URL ?? "http://127.0.0.1:3847/trpc";

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

async function main() {
  const agent = await client.agent.create.mutate({
    model: { id: "composer-2.5" },
    cwd: process.cwd(),
  });
  console.log("agentId:", agent.agentId);

  const run = await client.run.start.mutate({
    agentId: agent.agentId,
    prompt: "Say hi in one short sentence.",
  });
  console.log("runId:", run.runId);

  const TERMINAL = new Set(["finished", "error", "cancelled"]);

  for (;;) {
    const poll = await client.run.poll.mutate({ runId: run.runId });
  for (const message of poll.messages) {
    if (message.content.trim()) {
      console.log(`[${message.eventType}]`, message.content.slice(0, 120));
    }
  }
    if (poll.status === "finished") {
      console.log("done:", poll.resultText);
      break;
    }
    if (poll.status && TERMINAL.has(poll.status)) break;
    await new Promise((r) => setTimeout(r, 500));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
