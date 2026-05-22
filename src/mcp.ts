import type { McpServerConfig as SdkMcpServerConfig } from "@cursor/sdk";
import type { z } from "zod";
import { McpServerConfig, McpServerMap } from "./schemas.ts";

type McpServerMapType = z.infer<typeof McpServerMap>;
type McpServerConfigType = z.infer<typeof McpServerConfig>;

export function toSdkMcpServer(config: McpServerConfigType): SdkMcpServerConfig {
  if (config.type === "local") {
    const [command, ...args] = config.command;
    return {
      type: "stdio",
      command,
      ...(args.length > 0 ? { args } : {}),
      ...(config.environment ? { env: config.environment } : {}),
    };
  }

  return {
    type: "http",
    url: config.url,
    ...(config.headers ? { headers: config.headers } : {}),
  };
}

export function toSdkMcpServers(
  mcpServers?: McpServerMapType,
): Record<string, SdkMcpServerConfig> | undefined {
  if (!mcpServers) return undefined;

  return Object.fromEntries(
    Object.entries(mcpServers).map(([name, config]) => [
      name,
      toSdkMcpServer(config),
    ]),
  );
}
