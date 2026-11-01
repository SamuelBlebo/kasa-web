/**
 * Seam for the AI assistant (not built yet). Two places will use it:
 *
 *  1. Reading messages — nlu/engine.ts' NluEngine. Swap RulesEngine for an
 *     LLM-backed engine in nlu/index.ts; the bot, draft orders and the
 *     "a human confirms" rule do not change.
 *  2. Helping the merchant — suggested replies in the Inbox and daily
 *     summaries, behind this interface.
 *
 * Whatever implements this must never place an order, verify a payment or
 * send a message on its own: it suggests, a person decides.
 */
export interface ConversationTurn {
  direction: 'in' | 'out';
  body: string;
}

export interface MerchantAssistant {
  suggestReplies(input: { orgId: string; customerId: string; conversation: ConversationTurn[] }): Promise<string[]>;
  summarizeDay(input: { orgId: string; date: string }): Promise<string>;
}

/** Placeholder used until an assistant is configured. */
export const noAssistant: MerchantAssistant = {
  suggestReplies: async () => [],
  summarizeDay: async () => '',
};
