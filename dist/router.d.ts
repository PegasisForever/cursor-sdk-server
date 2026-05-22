import type { ServerContext } from "./services.ts";
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
            };
            output: {
                agentId?: string;
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
                agentId?: string;
                prompt?: string;
            };
            output: {
                agentId?: string;
                runId?: string;
            };
            meta: object;
        }>;
        poll: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                runId?: string;
            };
            output: {
                status?: "running";
                runId?: string;
                messages?: string[];
            } | {
                status?: "finished";
                runId?: string;
                messages?: string[];
                resultText?: string;
            } | {
                status?: "error" | "cancelled";
                runId?: string;
                messages?: string[];
            };
            meta: object;
        }>;
    }>>;
}>>;
export type AppRouter = typeof appRouter;
//# sourceMappingURL=router.d.ts.map