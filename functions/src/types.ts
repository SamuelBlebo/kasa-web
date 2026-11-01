import { z } from 'zod';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export type SessionStep =
  | 'idle'
  | 'catalog'
  | 'awaiting_qty'
  | 'awaiting_name'
  | 'awaiting_address'
  | 'awaiting_confirm';

export interface Session {
  step: SessionStep;
  cart: OrderItem[];
  catalogPage: number;
  pendingProductId: string | null;
  draftName: string | null;
  draftAddress: string | null;
  handledMessageIds: string[];
  updatedAt: FirebaseFirestore.Timestamp;
}

/** What every outbound Graph API call needs. */
export interface WhatsappCredentials {
  phoneNumberId: string;
  businessAccountId: string;
  displayPhone: string;
  accessToken: string;
}

export type WebhookStatus = 'pending' | 'verified' | 'disconnected';

/**
 * The `whatsappAccounts/{phoneNumberId}` document — the one record an inbound
 * webhook call resolves to get both the tenant and everything needed to reply.
 */
export interface WhatsappAccount extends WhatsappCredentials {
  organizationId: string;
  webhookStatus: WebhookStatus;
  connectedAt?: FirebaseFirestore.Timestamp;
}

/* ------------------------------ Callable input ----------------------------- */

export const createOrgInput = z.object({
  businessName: z.string().min(2).max(80),
  fullName: z.string().min(2).max(80),
});

/** displayPhone is deliberately not here — connectWhatsapp trusts Meta's own probe response for it, not whatever a merchant typed. */
export const connectWhatsappInput = z.object({
  phoneNumberId: z.string().min(5).max(64),
  businessAccountId: z.string().min(5).max(64),
  accessToken: z.string().min(20).max(500),
});

export const testMessageInput = z.object({
  to: z.string().regex(/^\+?[0-9]{8,15}$/),
});

export const broadcastInput = z.object({
  message: z.string().min(1).max(1000),
  // Capped so one call stays well inside the callable's execution window —
  // see BROADCAST_BATCH_SIZE and the explicit timeout in http/customers.ts.
  customerIds: z.array(z.string().min(1)).min(1).max(300),
});

export const sendReplyInput = z.object({
  customerId: z.string().min(1),
  text: z.string().min(1).max(1000),
});

/* ------------------------------ Webhook shapes ----------------------------- */

export interface InboundMessage {
  from: string;
  id: string;
  type: string;
  text?: { body: string };
  interactive?: {
    type: 'list_reply' | 'button_reply';
    list_reply?: { id: string; title: string };
    button_reply?: { id: string; title: string };
  };
}

export interface WebhookValue {
  metadata?: { phone_number_id?: string };
  messages?: InboundMessage[];
  contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
  statuses?: unknown[];
}
