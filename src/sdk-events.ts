import type { SendOptions } from "@cursor/sdk";
import type { PollMessageType } from "./schemas.js";

type ConversationStep = Parameters<NonNullable<SendOptions["onStep"]>>[0]["step"];

type ToolMessage = Extract<ConversationStep, { type: "toolCall" }>["message"];
type ToolResult = { status: "success" | "error"; value?: unknown };

function truncate(text: string, max = 60): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) {
    return oneLine;
  }
  return `${oneLine.slice(0, max - 1)}…`;
}

function quote(text: string): string {
  const t = truncate(text);
  return /[\s"'`]/.test(t) ? `"${t.replace(/"/g, '\\"')}"` : t;
}

function getResult(tool: ToolMessage): ToolResult | undefined {
  if (!("result" in tool) || tool.result === undefined) {
    return undefined;
  }
  return tool.result as ToolResult;
}

function outcome(result: ToolResult | undefined, success = ""): string {
  if (!result) {
    return "";
  }
  if (result.status === "error") {
    return " → failed";
  }
  if (success) {
    return ` → ${success}`;
  }
  return " → done";
}

function grepMatchCount(value: unknown): number | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const v = value as Record<string, unknown>;
  let total = 0;
  let found = false;

  const countFrom = (entry: unknown) => {
    if (typeof entry !== "object" || entry === null) {
      return;
    }
    const output = (entry as Record<string, unknown>).output as
      | Record<string, unknown>
      | undefined;
    if (!output) {
      return;
    }

    const n =
      typeof output.totalMatches === "number"
        ? output.totalMatches
        : typeof output.total === "number"
          ? output.total
          : typeof output.count === "number"
            ? output.count
            : undefined;
    if (n !== undefined) {
      total += n;
      found = true;
    }
  };

  const workspaceResults = v.workspaceResults;
  if (typeof workspaceResults === "object" && workspaceResults !== null) {
    for (const entry of Object.values(workspaceResults)) {
      countFrom(entry);
    }
  }
  countFrom(v.activeEditorResult);

  return found ? total : undefined;
}

function formatToolCall(tool: ToolMessage): string {
  const result = getResult(tool);

  switch (tool.type) {
    case "grep": {
      const { pattern, path } = tool.args;
      const where = path ? ` in ${path}` : "";
      const count =
        result?.status === "success" ? grepMatchCount(result.value) : undefined;
      const summary =
        count === undefined
          ? ""
          : `${count} match${count === 1 ? "" : "es"}`;
      return `grep ${quote(pattern)}${where}${outcome(result, summary)}`;
    }
    case "read": {
      const lines =
        result?.status === "success" &&
        typeof result.value === "object" &&
        result.value !== null &&
        typeof (result.value as { totalLines?: unknown }).totalLines === "number"
          ? `${(result.value as { totalLines: number }).totalLines} lines`
          : "";
      return `read ${tool.args.path}${outcome(result, lines)}`;
    }
    case "edit": {
      let change = "";
      if (result?.status === "success" && typeof result.value === "object" && result.value !== null) {
        const v = result.value as { linesAdded?: number; linesRemoved?: number };
        const parts: string[] = [];
        if (v.linesAdded) {
          parts.push(`+${v.linesAdded}`);
        }
        if (v.linesRemoved) {
          parts.push(`-${v.linesRemoved}`);
        }
        change = parts.join("/");
      }
      return `edit ${tool.args.path}${outcome(result, change)}`;
    }
    case "write":
      return `write ${tool.args.path}${outcome(result)}`;
    case "delete":
      return `delete ${tool.args.path}${outcome(result)}`;
    case "shell": {
      const summary =
        result?.status === "success" &&
        typeof result.value === "object" &&
        result.value !== null &&
        typeof (result.value as { exitCode?: unknown }).exitCode === "number"
          ? `exit ${(result.value as { exitCode: number }).exitCode}`
          : "";
      return `shell ${quote(tool.args.command)}${outcome(result, summary)}`;
    }
    case "glob": {
      const where = tool.args.targetDirectory ? ` in ${tool.args.targetDirectory}` : "";
      const count =
        result?.status === "success" &&
        typeof result.value === "object" &&
        result.value !== null &&
        typeof (result.value as { totalFiles?: unknown }).totalFiles === "number"
          ? `${(result.value as { totalFiles: number }).totalFiles} files`
          : "";
      return `glob ${quote(tool.args.globPattern)}${where}${outcome(result, count)}`;
    }
    case "ls":
      return `ls ${tool.args.path}${outcome(result)}`;
    case "readLints": {
      const paths = tool.args.paths.join(", ");
      const count =
        result?.status === "success" &&
        typeof result.value === "object" &&
        result.value !== null &&
        typeof (result.value as { totalDiagnostics?: unknown }).totalDiagnostics ===
          "number"
          ? `${(result.value as { totalDiagnostics: number }).totalDiagnostics} diagnostics`
          : "";
      return `read_lints ${paths}${outcome(result, count)}`;
    }
    case "mcp": {
      const { providerIdentifier, toolName } = tool.args;
      const label = [providerIdentifier, toolName].filter(Boolean).join("/") || "tool";
      return `mcp ${label}${outcome(result)}`;
    }
    case "semSearch":
      return `search ${quote(tool.args.query)}${outcome(result)}`;
    case "task":
      return `task ${quote(tool.args.description)}${outcome(result)}`;
    case "createPlan":
      return `create_plan${outcome(result)}`;
    case "updateTodos": {
      const count = tool.args.todos.length;
      return `update_todos (${count} item${count === 1 ? "" : "s"})${outcome(result)}`;
    }
    case "generateImage":
      return `generate_image${outcome(result)}`;
    case "recordScreen":
      return `record_screen${outcome(result)}`;
    default: {
      const unknownTool = tool as { type: string; args?: Record<string, unknown> };
      const arg = unknownTool.args
        ? Object.values(unknownTool.args).find((value) => typeof value === "string")
        : undefined;
      const detail = arg ? ` ${quote(String(arg))}` : "";
      return `${unknownTool.type}${detail}${outcome(result)}`;
    }
  }
}

function formatThinkingText(text: string, thinkingDurationMs?: number): string {
  if (thinkingDurationMs === undefined) {
    return text;
  }

  if (!text) {
    return `Thought for ${thinkingDurationMs}ms`;
  }

  return `${text} (${thinkingDurationMs}ms)`;
}

export function conversationStepToPollMessage(step: ConversationStep): PollMessageType {
  switch (step.type) {
    case "assistantMessage":
      return { eventType: "assistant", content: step.message.text };
    case "thinkingMessage":
      return {
        eventType: "thinking",
        content: formatThinkingText(
          step.message.text,
          step.message.thinkingDurationMs,
        ),
      };
    case "toolCall":
      return {
        eventType: "tool_call",
        content: formatToolCall(step.message),
      };
    default: {
      const _exhaustive: never = step;
      throw new Error(`Unknown conversation step type: ${(_exhaustive as ConversationStep).type}`);
    }
  }
}
