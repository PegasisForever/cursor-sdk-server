#!/usr/bin/env bun
import { loadConfig } from "./config.ts";
import { startServer } from "./server.ts";

try {
  const config = loadConfig();
  startServer(config);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
