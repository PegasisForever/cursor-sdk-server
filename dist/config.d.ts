export type LogLevel = "debug" | "info" | "warn" | "error";
export interface ServerConfig {
    port: number;
    host: string;
    maxAgents: number;
    runRetentionMs: number;
    runBufferSize: number;
    logLevel: LogLevel;
}
export declare function loadConfig(argv?: string[]): ServerConfig;
//# sourceMappingURL=config.d.ts.map