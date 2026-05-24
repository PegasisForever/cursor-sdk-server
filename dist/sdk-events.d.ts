import type { SendOptions } from "@cursor/sdk";
import type { PollMessageType } from "./schemas.js";
type ConversationStep = Parameters<NonNullable<SendOptions["onStep"]>>[0]["step"];
export declare function conversationStepToPollMessage(step: ConversationStep): PollMessageType;
export {};
//# sourceMappingURL=sdk-events.d.ts.map