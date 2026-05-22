import type { z } from "zod";
import { McpServerConfig, McpServers } from "./schemas.ts";

type McpServersType = z.infer<typeof McpServers>;
type McpServerConfigType = z.infer<typeof McpServerConfig>;

export function validateMcpServers(mcpServers?: McpServersType): void {
  if (!mcpServers) return;

  for (const [name, config] of Object.entries(mcpServers)) {
    const hasUrl = "url" in config && config.url !== undefined;
    const hasCommand = "command" in config && config.command !== undefined;

    if (hasUrl && hasCommand) {
      throw new Error(
        `MCP server "${name}" has both url and command; specify one transport`,
      );
    }
    if (!hasUrl && !hasCommand) {
      throw new Error(
        `MCP server "${name}" must have either url or command`,
      );
    }
  }
}

export function toSdkMcpServers(
  mcpServers?: McpServersType,
): Record<string, McpServerConfigType> | undefined {
  if (!mcpServers) return undefined;
  return mcpServers;
}
