const LEVEL_RANK = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};
export class Logger {
    level;
    constructor(level) {
        this.level = level;
    }
    shouldLog(level) {
        return LEVEL_RANK[level] >= LEVEL_RANK[this.level];
    }
    debug(message, meta) {
        if (this.shouldLog("debug"))
            this.write("debug", message, meta);
    }
    info(message, meta) {
        if (this.shouldLog("info"))
            this.write("info", message, meta);
    }
    warn(message, meta) {
        if (this.shouldLog("warn"))
            this.write("warn", message, meta);
    }
    error(message, meta) {
        if (this.shouldLog("error"))
            this.write("error", message, meta);
    }
    write(level, message, meta) {
        const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${message}`;
        if (meta !== undefined) {
            console.error(line, meta);
        }
        else {
            console.error(line);
        }
    }
}
export function createLogger(config) {
    return new Logger(config.logLevel);
}
