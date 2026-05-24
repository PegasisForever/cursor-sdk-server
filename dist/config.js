const LOG_LEVELS = ["debug", "info", "warn", "error"];
function parseArgs(argv) {
    const result = {};
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (!arg.startsWith("--"))
            continue;
        const key = arg.slice(2);
        const next = argv[i + 1];
        if (!next || next.startsWith("--")) {
            result[key] = true;
        }
        else {
            result[key] = next;
            i++;
        }
    }
    return result;
}
function readString(args, flag, envVar, fallback) {
    const fromArg = args[flag];
    if (typeof fromArg === "string")
        return fromArg;
    const fromEnv = process.env[envVar];
    if (fromEnv)
        return fromEnv;
    return fallback;
}
function readNumber(args, flag, envVar, fallback) {
    const raw = readString(args, flag, envVar, String(fallback));
    const value = Number(raw);
    if (!Number.isFinite(value)) {
        throw new Error(`Invalid number for --${flag}: ${raw}`);
    }
    return value;
}
export function loadConfig(argv = process.argv.slice(2)) {
    const args = parseArgs(argv);
    const logLevel = readString(args, "log-level", "CURSOR_SDK_SERVER_LOG_LEVEL", "info");
    if (!LOG_LEVELS.includes(logLevel)) {
        throw new Error(`Invalid log level: ${logLevel}`);
    }
    return {
        port: readNumber(args, "port", "CURSOR_SDK_SERVER_PORT", 3847),
        host: readString(args, "host", "CURSOR_SDK_SERVER_HOST", "127.0.0.1"),
        logLevel,
    };
}
