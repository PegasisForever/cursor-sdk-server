import type { McpServerConfig as SdkMcpServerConfig } from "@cursor/sdk";
import type { z } from "zod";
import { McpServerConfig, McpServerMap } from "./schemas.ts";
type McpServerMapType = z.infer<typeof McpServerMap>;
type McpServerConfigType = z.infer<typeof McpServerConfig>;
export declare function toSdkMcpServer(config: McpServerConfigType): SdkMcpServerConfig;
export declare function toSdkMcpServers(mcpServers?: McpServerMapType): Record<string, SdkMcpServerConfig> | undefined;
export {};
//# sourceMappingURL=mcp.d.ts.map