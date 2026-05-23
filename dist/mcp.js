export function toSdkMcpServer(config) {
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
export function toSdkMcpServers(mcpServers) {
    if (!mcpServers)
        return undefined;
    return Object.fromEntries(Object.entries(mcpServers).map(([name, config]) => [
        name,
        toSdkMcpServer(config),
    ]));
}
