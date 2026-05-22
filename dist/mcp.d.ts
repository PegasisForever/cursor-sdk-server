import type { z } from "zod";
import { McpServerConfig, McpServers } from "./schemas.ts";
type McpServersType = z.infer<typeof McpServers>;
type McpServerConfigType = z.infer<typeof McpServerConfig>;
export declare function validateMcpServers(mcpServers?: McpServersType): void;
export declare function toSdkMcpServers(mcpServers?: McpServersType): Record<string, McpServerConfigType> | undefined;
export {};
//# sourceMappingURL=mcp.d.ts.map