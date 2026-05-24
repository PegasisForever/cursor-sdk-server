import type { ServerContext } from "./services.js";
export interface CreateContextOptions {
    ctx: ServerContext;
}
export declare function createContext(opts: CreateContextOptions): ServerContext;
export declare const appRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: ServerContext;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    agent: import("@trpc/server").TRPCBuiltRouter<{
        ctx: ServerContext;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        create: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                model: {
                    id: string;
                    params?: {
                        id: string;
                        value: string;
                    }[] | undefined;
                };
                cwd: string;
                mcpServers?: Record<string, {
                    type: "local";
                    command: string[];
                    environment?: Record<string, string> | undefined;
                    timeout?: number | undefined;
                } | {
                    type: "remote";
                    url: string;
                    timeout?: number | undefined;
                    headers?: Record<string, string> | undefined;
                }> | undefined;
            };
            output: {
                agentId: string;
            };
            meta: object;
        }>;
    }>>;
    run: import("@trpc/server").TRPCBuiltRouter<{
        ctx: ServerContext;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        start: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                agentId: string;
                prompt: string;
            };
            output: {
                agentId: string;
                runId: string;
            };
            meta: object;
        }>;
        poll: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                runId: string;
            };
            output: {
                status: "running";
                runId: string;
                messages: {
                    eventType: "assistant" | "tool_call" | "thinking";
                    content: string;
                }[];
            } | {
                status: "finished";
                runId: string;
                messages: {
                    eventType: "assistant" | "tool_call" | "thinking";
                    content: string;
                }[];
                resultText: string;
            } | {
                status: "error" | "cancelled";
                runId: string;
                messages: {
                    eventType: "assistant" | "tool_call" | "thinking";
                    content: string;
                }[];
            };
            meta: object;
        }>;
    }>>;
}>>;
export type AppRouter = typeof appRouter;
//# sourceMappingURL=router.d.ts.map