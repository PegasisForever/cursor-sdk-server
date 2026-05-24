function formatValue(value, indent = 0) {
    const pad = "  ".repeat(indent);
    if (value === null || value === undefined) {
        return "";
    }
    if (typeof value === "string") {
        return value;
    }
    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }
    if (Array.isArray(value)) {
        if (value.length === 0) {
            return "(empty)";
        }
        if (value.every((item) => typeof item === "string" || typeof item === "number")) {
            return value.join(", ");
        }
        return value
            .map((item) => `${pad}- ${formatValue(item, indent + 1).replace(/\n/g, `\n${pad}  `)}`)
            .join("\n");
    }
    if (typeof value === "object") {
        const entries = Object.entries(value);
        if (entries.length === 0) {
            return "(empty)";
        }
        return entries
            .map(([key, nested]) => {
            const formatted = formatValue(nested, indent + 1);
            if (formatted.includes("\n")) {
                return `${pad}${key}:\n${formatted
                    .split("\n")
                    .map((line) => `${pad}  ${line}`)
                    .join("\n")}`;
            }
            return `${pad}${key}: ${formatted}`;
        })
            .join("\n");
    }
    return String(value);
}
function formatToolCall(tool) {
    const lines = [tool.type];
    if ("args" in tool && tool.args !== undefined) {
        lines.push("Args:");
        lines.push(formatValue(tool.args, 1));
    }
    if ("result" in tool && tool.result !== undefined) {
        lines.push("Result:");
        lines.push(formatValue(tool.result, 1));
    }
    return lines.join("\n");
}
function formatThinkingText(text, thinkingDurationMs) {
    if (thinkingDurationMs === undefined) {
        return text;
    }
    if (!text) {
        return `Thought for ${thinkingDurationMs}ms`;
    }
    return `${text} (${thinkingDurationMs}ms)`;
}
export function conversationStepToPollMessage(step) {
    switch (step.type) {
        case "assistantMessage":
            return { eventType: "assistant", content: step.message.text };
        case "thinkingMessage":
            return {
                eventType: "thinking",
                content: formatThinkingText(step.message.text, step.message.thinkingDurationMs),
            };
        case "toolCall":
            return {
                eventType: "tool_call",
                content: formatToolCall(step.message),
            };
        default: {
            const _exhaustive = step;
            throw new Error(`Unknown conversation step type: ${_exhaustive.type}`);
        }
    }
}
