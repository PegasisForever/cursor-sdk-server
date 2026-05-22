import { z } from "zod";
export declare const AgentId: z.ZodString;
export declare const RunId: z.ZodString;
export declare const ModelParam: z.ZodObject<{
    id: z.ZodString;
    value: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id?: string;
    value?: string;
}, {
    id?: string;
    value?: string;
}>;
export declare const ModelSelection: z.ZodObject<{
    id: z.ZodString;
    params: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        value: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        value?: string;
    }, {
        id?: string;
        value?: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    params?: {
        id?: string;
        value?: string;
    }[];
}, {
    id?: string;
    params?: {
        id?: string;
        value?: string;
    }[];
}>;
export declare const RunStatus: z.ZodEnum<["running", "finished", "error", "cancelled"]>;
export declare const McpStdioServer: z.ZodObject<{
    type: z.ZodOptional<z.ZodLiteral<"stdio">>;
    command: z.ZodString;
    args: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    cwd: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type?: "stdio";
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    cwd?: string;
}, {
    type?: "stdio";
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    cwd?: string;
}>;
export declare const McpHttpAuth: z.ZodObject<{
    CLIENT_ID: z.ZodString;
    CLIENT_SECRET: z.ZodOptional<z.ZodString>;
    scopes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    CLIENT_ID?: string;
    CLIENT_SECRET?: string;
    scopes?: string[];
}, {
    CLIENT_ID?: string;
    CLIENT_SECRET?: string;
    scopes?: string[];
}>;
export declare const McpHttpServer: z.ZodObject<{
    type: z.ZodOptional<z.ZodEnum<["http", "sse"]>>;
    url: z.ZodString;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    auth: z.ZodOptional<z.ZodObject<{
        CLIENT_ID: z.ZodString;
        CLIENT_SECRET: z.ZodOptional<z.ZodString>;
        scopes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        CLIENT_ID?: string;
        CLIENT_SECRET?: string;
        scopes?: string[];
    }, {
        CLIENT_ID?: string;
        CLIENT_SECRET?: string;
        scopes?: string[];
    }>>;
}, "strip", z.ZodTypeAny, {
    type?: "http" | "sse";
    url?: string;
    headers?: Record<string, string>;
    auth?: {
        CLIENT_ID?: string;
        CLIENT_SECRET?: string;
        scopes?: string[];
    };
}, {
    type?: "http" | "sse";
    url?: string;
    headers?: Record<string, string>;
    auth?: {
        CLIENT_ID?: string;
        CLIENT_SECRET?: string;
        scopes?: string[];
    };
}>;
export declare const McpServerConfig: z.ZodUnion<[z.ZodObject<{
    type: z.ZodOptional<z.ZodLiteral<"stdio">>;
    command: z.ZodString;
    args: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    cwd: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type?: "stdio";
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    cwd?: string;
}, {
    type?: "stdio";
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    cwd?: string;
}>, z.ZodObject<{
    type: z.ZodOptional<z.ZodEnum<["http", "sse"]>>;
    url: z.ZodString;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    auth: z.ZodOptional<z.ZodObject<{
        CLIENT_ID: z.ZodString;
        CLIENT_SECRET: z.ZodOptional<z.ZodString>;
        scopes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        CLIENT_ID?: string;
        CLIENT_SECRET?: string;
        scopes?: string[];
    }, {
        CLIENT_ID?: string;
        CLIENT_SECRET?: string;
        scopes?: string[];
    }>>;
}, "strip", z.ZodTypeAny, {
    type?: "http" | "sse";
    url?: string;
    headers?: Record<string, string>;
    auth?: {
        CLIENT_ID?: string;
        CLIENT_SECRET?: string;
        scopes?: string[];
    };
}, {
    type?: "http" | "sse";
    url?: string;
    headers?: Record<string, string>;
    auth?: {
        CLIENT_ID?: string;
        CLIENT_SECRET?: string;
        scopes?: string[];
    };
}>]>;
export declare const McpServers: z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodObject<{
    type: z.ZodOptional<z.ZodLiteral<"stdio">>;
    command: z.ZodString;
    args: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    cwd: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type?: "stdio";
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    cwd?: string;
}, {
    type?: "stdio";
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    cwd?: string;
}>, z.ZodObject<{
    type: z.ZodOptional<z.ZodEnum<["http", "sse"]>>;
    url: z.ZodString;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    auth: z.ZodOptional<z.ZodObject<{
        CLIENT_ID: z.ZodString;
        CLIENT_SECRET: z.ZodOptional<z.ZodString>;
        scopes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        CLIENT_ID?: string;
        CLIENT_SECRET?: string;
        scopes?: string[];
    }, {
        CLIENT_ID?: string;
        CLIENT_SECRET?: string;
        scopes?: string[];
    }>>;
}, "strip", z.ZodTypeAny, {
    type?: "http" | "sse";
    url?: string;
    headers?: Record<string, string>;
    auth?: {
        CLIENT_ID?: string;
        CLIENT_SECRET?: string;
        scopes?: string[];
    };
}, {
    type?: "http" | "sse";
    url?: string;
    headers?: Record<string, string>;
    auth?: {
        CLIENT_ID?: string;
        CLIENT_SECRET?: string;
        scopes?: string[];
    };
}>]>>;
export declare const CreateAgentInput: z.ZodObject<{
    model: z.ZodObject<{
        id: z.ZodString;
        params: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            value: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id?: string;
            value?: string;
        }, {
            id?: string;
            value?: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        params?: {
            id?: string;
            value?: string;
        }[];
    }, {
        id?: string;
        params?: {
            id?: string;
            value?: string;
        }[];
    }>;
    cwd: z.ZodString;
    mcpServers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodObject<{
        type: z.ZodOptional<z.ZodLiteral<"stdio">>;
        command: z.ZodString;
        args: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        cwd: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type?: "stdio";
        command?: string;
        args?: string[];
        env?: Record<string, string>;
        cwd?: string;
    }, {
        type?: "stdio";
        command?: string;
        args?: string[];
        env?: Record<string, string>;
        cwd?: string;
    }>, z.ZodObject<{
        type: z.ZodOptional<z.ZodEnum<["http", "sse"]>>;
        url: z.ZodString;
        headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        auth: z.ZodOptional<z.ZodObject<{
            CLIENT_ID: z.ZodString;
            CLIENT_SECRET: z.ZodOptional<z.ZodString>;
            scopes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            CLIENT_ID?: string;
            CLIENT_SECRET?: string;
            scopes?: string[];
        }, {
            CLIENT_ID?: string;
            CLIENT_SECRET?: string;
            scopes?: string[];
        }>>;
    }, "strip", z.ZodTypeAny, {
        type?: "http" | "sse";
        url?: string;
        headers?: Record<string, string>;
        auth?: {
            CLIENT_ID?: string;
            CLIENT_SECRET?: string;
            scopes?: string[];
        };
    }, {
        type?: "http" | "sse";
        url?: string;
        headers?: Record<string, string>;
        auth?: {
            CLIENT_ID?: string;
            CLIENT_SECRET?: string;
            scopes?: string[];
        };
    }>]>>>;
}, "strip", z.ZodTypeAny, {
    cwd?: string;
    model?: {
        id?: string;
        params?: {
            id?: string;
            value?: string;
        }[];
    };
    mcpServers?: Record<string, {
        type?: "stdio";
        command?: string;
        args?: string[];
        env?: Record<string, string>;
        cwd?: string;
    } | {
        type?: "http" | "sse";
        url?: string;
        headers?: Record<string, string>;
        auth?: {
            CLIENT_ID?: string;
            CLIENT_SECRET?: string;
            scopes?: string[];
        };
    }>;
}, {
    cwd?: string;
    model?: {
        id?: string;
        params?: {
            id?: string;
            value?: string;
        }[];
    };
    mcpServers?: Record<string, {
        type?: "stdio";
        command?: string;
        args?: string[];
        env?: Record<string, string>;
        cwd?: string;
    } | {
        type?: "http" | "sse";
        url?: string;
        headers?: Record<string, string>;
        auth?: {
            CLIENT_ID?: string;
            CLIENT_SECRET?: string;
            scopes?: string[];
        };
    }>;
}>;
export declare const CreateAgentOutput: z.ZodObject<{
    agentId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    agentId?: string;
}, {
    agentId?: string;
}>;
export declare const StartRunInput: z.ZodObject<{
    agentId: z.ZodString;
    prompt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    agentId?: string;
    prompt?: string;
}, {
    agentId?: string;
    prompt?: string;
}>;
export declare const StartRunOutput: z.ZodObject<{
    runId: z.ZodString;
    agentId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    agentId?: string;
    runId?: string;
}, {
    agentId?: string;
    runId?: string;
}>;
export declare const PollRunInput: z.ZodObject<{
    runId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    runId?: string;
}, {
    runId?: string;
}>;
export declare const PollRunOutput: z.ZodDiscriminatedUnion<"status", [z.ZodObject<{
    runId: z.ZodString;
    status: z.ZodLiteral<"running">;
    messages: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    status?: "running";
    runId?: string;
    messages?: string[];
}, {
    status?: "running";
    runId?: string;
    messages?: string[];
}>, z.ZodObject<{
    runId: z.ZodString;
    status: z.ZodLiteral<"finished">;
    messages: z.ZodArray<z.ZodString, "many">;
    resultText: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status?: "finished";
    runId?: string;
    messages?: string[];
    resultText?: string;
}, {
    status?: "finished";
    runId?: string;
    messages?: string[];
    resultText?: string;
}>, z.ZodObject<{
    runId: z.ZodString;
    status: z.ZodEnum<["error", "cancelled"]>;
    messages: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    status?: "error" | "cancelled";
    runId?: string;
    messages?: string[];
}, {
    status?: "error" | "cancelled";
    runId?: string;
    messages?: string[];
}>]>;
export type AgentIdType = z.infer<typeof AgentId>;
export type RunIdType = z.infer<typeof RunId>;
export type RunStatusType = z.infer<typeof RunStatus>;
export type CreateAgentInputType = z.infer<typeof CreateAgentInput>;
export type StartRunInputType = z.infer<typeof StartRunInput>;
export type PollRunOutputType = z.infer<typeof PollRunOutput>;
//# sourceMappingURL=schemas.d.ts.map