import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { ServerConfig } from "./config.ts";
import { createLogger } from "./logger.ts";
import { AgentRegistry } from "./agent-registry.ts";
import { RunRegistry } from "./run-registry.ts";
import { appRouter } from "./router.ts";
import {
  evictExpiredRuns,
  shutdownServer,
  type ServerContext,
} from "./services.ts";

export interface StartedServer {
  url: string;
  stop: () => Promise<void>;
}

export function startServer(config: ServerConfig): StartedServer {
  const apiKey = process.env.CURSOR_API_KEY;
  if (!apiKey) {
    console.error("CURSOR_API_KEY is required");
    process.exit(1);
  }

  const logger = createLogger(config);
  const agents = new AgentRegistry(config.maxAgents);
  const runs = new RunRegistry();

  const ctx: ServerContext = {
    apiKey,
    config,
    logger,
    agents,
    runs,
    shuttingDown: false,
  };

  const evictionTimer = setInterval(() => {
    evictExpiredRuns(ctx);
  }, 60_000);
  evictionTimer.unref();

  let server: ReturnType<typeof Bun.serve> | undefined;

  const stop = async () => {
    clearInterval(evictionTimer);
    if (server) {
      server.stop(true);
      server = undefined;
    }
    await shutdownServer(ctx);
  };

  server = Bun.serve({
    hostname: config.host,
    port: config.port,
    fetch(request) {
      if (ctx.shuttingDown) {
        return new Response("Server shutting down", { status: 503 });
      }

      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: corsHeaders(),
        });
      }

      return fetchRequestHandler({
        endpoint: "/trpc",
        req: request,
        router: appRouter,
        createContext: () => ctx,
        responseMeta() {
          return {
            headers: corsHeaders(),
          };
        },
        onError({ error, path }) {
          logger.error(`tRPC error on ${path ?? "unknown"}`, error);
        },
      });
    },
  });

  const url = `http://${config.host}:${config.port}/trpc`;
  console.log(`cursor-sdk-server listening on ${url}`);

  const handleSignal = () => {
    void (async () => {
      await stop();
      process.exit(0);
    })();
  };

  process.once("SIGINT", handleSignal);
  process.once("SIGTERM", handleSignal);

  return { url, stop };
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
  };
}
