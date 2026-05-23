import { createServer, type Server } from "node:http";
import { createHTTPHandler } from "@trpc/server/adapters/standalone";
import type { ServerConfig } from "./config.js";
import { createLogger } from "./logger.js";
import { AgentRegistry } from "./agent-registry.js";
import { RunRegistry } from "./run-registry.js";
import { appRouter } from "./router.js";
import {
  evictExpiredRuns,
  shutdownServer,
  type ServerContext,
} from "./services.js";

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

  const trpcHandler = createHTTPHandler({
    router: appRouter,
    createContext: () => ctx,
    basePath: "/trpc/",
    onError({ error, path }) {
      logger.error(`tRPC error on ${path ?? "unknown"}`, error);
    },
  });

  let server: Server | undefined;

  const stop = async () => {
    clearInterval(evictionTimer);
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((err) => (err ? reject(err) : resolve()));
      });
      server = undefined;
    }
    await shutdownServer(ctx);
  };

  server = createServer((req, res) => {
    for (const [key, value] of Object.entries(corsHeaders())) {
      res.setHeader(key, value);
    }

    if (ctx.shuttingDown) {
      res.writeHead(503);
      res.end("Server shutting down");
      return;
    }

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    trpcHandler(req, res);
  });

  server.listen(config.port, config.host, () => {
    const url = `http://${config.host}:${config.port}/trpc`;
    console.log(`cursor-sdk-server listening on ${url}`);
  });

  const handleSignal = () => {
    void (async () => {
      await stop();
      process.exit(0);
    })();
  };

  process.once("SIGINT", handleSignal);
  process.once("SIGTERM", handleSignal);

  process.on("unhandledRejection", (reason) => {
    logger.warn("Unhandled rejection (ignored)", reason);
  });

  return {
    url: `http://${config.host}:${config.port}/trpc`,
    stop,
  };
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
  };
}
