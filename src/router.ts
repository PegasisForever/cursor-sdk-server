import { initTRPC } from "@trpc/server";
import {
  CreateAgentInput,
  CreateAgentOutput,
  PollRunInput,
  PollRunOutput,
  StartRunInput,
  StartRunOutput,
} from "./schemas.ts";
import type { ServerContext } from "./services.ts";
import { createAgent, pollRun, startRun } from "./services.ts";

export interface CreateContextOptions {
  ctx: ServerContext;
}

export function createContext(opts: CreateContextOptions): ServerContext {
  return opts.ctx;
}

const t = initTRPC.context<ServerContext>().create();

export const appRouter = t.router({
  agent: t.router({
    create: t.procedure
      .input(CreateAgentInput)
      .output(CreateAgentOutput)
      .mutation(async ({ ctx, input }) => createAgent(ctx, input)),
  }),
  run: t.router({
    start: t.procedure
      .input(StartRunInput)
      .output(StartRunOutput)
      .mutation(async ({ ctx, input }) =>
        startRun(ctx, { agentId: input.agentId, prompt: input.prompt }),
      ),
    poll: t.procedure
      .input(PollRunInput)
      .output(PollRunOutput)
      .mutation(({ ctx, input }) => pollRun(ctx, { runId: input.runId })),
  }),
});

export type AppRouter = typeof appRouter;
