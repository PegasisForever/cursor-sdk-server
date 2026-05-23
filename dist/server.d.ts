import type { ServerConfig } from "./config.js";
export interface StartedServer {
    url: string;
    stop: () => Promise<void>;
}
export declare function startServer(config: ServerConfig): StartedServer;
//# sourceMappingURL=server.d.ts.map