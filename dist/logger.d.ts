import type { LogLevel, ServerConfig } from "./config.ts";
export declare class Logger {
    private readonly level;
    constructor(level: LogLevel);
    private shouldLog;
    debug(message: string, meta?: unknown): void;
    info(message: string, meta?: unknown): void;
    warn(message: string, meta?: unknown): void;
    error(message: string, meta?: unknown): void;
    private write;
}
export declare function createLogger(config: ServerConfig): Logger;
//# sourceMappingURL=logger.d.ts.map