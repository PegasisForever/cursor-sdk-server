#!/usr/bin/env node
import { loadConfig } from "./config.js";
import { startServer } from "./server.js";

try {
  const config = loadConfig();
  startServer(config);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
