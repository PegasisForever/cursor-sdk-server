import type { LogLevel, ServerConfig } from "./config.ts";

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export class Logger {
  constructor(private readonly level: LogLevel) {}

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_RANK[level] >= LEVEL_RANK[this.level];
  }

  debug(message: string, meta?: unknown): void {
    if (this.shouldLog("debug")) this.write("debug", message, meta);
  }

  info(message: string, meta?: unknown): void {
    if (this.shouldLog("info")) this.write("info", message, meta);
  }

  warn(message: string, meta?: unknown): void {
    if (this.shouldLog("warn")) this.write("warn", message, meta);
  }

  error(message: string, meta?: unknown): void {
    if (this.shouldLog("error")) this.write("error", message, meta);
  }

  private write(level: LogLevel, message: string, meta?: unknown): void {
    const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${message}`;
    if (meta !== undefined) {
      console.error(line, meta);
    } else {
      console.error(line);
    }
  }
}

export function createLogger(config: ServerConfig): Logger {
  return new Logger(config.logLevel);
}
