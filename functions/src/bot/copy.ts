import type { OrderStatus } from '../types';

export const BUTTONS = {
  browse: 'menu:browse',
  cart: 'menu:cart',
  checkout: 'cart:checkout',
  clear: 'cart:clear',
  addMore: 'cart:more',
  confirm: 'order:confirm',
  cancel: 'order:cancel',
  more: 'catalog:more',
  human: 'menu:human',
} as const;

/** Whatever the merchant has set on the order at the moment its status changes. */
export interface DeliveryContext {
  riderName?: string | null;
  riderPhone?: string | null;
  estimatedDeliveryAt?: FirebaseFirestore.Timestamp | null;
}

function formatEta(ts: FirebaseFirestore.Timestamp): string {
  return ts.toDate().toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const statusUpdate: Record<OrderStatus, (n: number, ctx?: DeliveryContext) => string | null> = {
  pending: () => null,
  confirmed: (n) => `Order #${n} is confirmed. We are getting it ready now.`,
  preparing: (n) => `Order #${n} is being prepared.`,
  out_for_delivery: (n, ctx) => {
    const lines = [`Order #${n} is on its way to you. Please keep your phone close.`];
    if (ctx?.riderName) {
      lines.push(`Rider: ${ctx.riderName}${ctx.riderPhone ? ` (${ctx.riderPhone})` : ''}`);
    }
    if (ctx?.estimatedDeliveryAt) {
      lines.push(`Estimated arrival: ${formatEta(ctx.estimatedDeliveryAt)}`);
    }
    return lines.join('\n');
  },
  delivered: (n) => `Order #${n} is delivered. Thank you for shopping with us.`,
  cancelled: (n) => `Order #${n} has been cancelled. Message us if this is a mistake.`,
};

/** Short present-tense label for "2 Track Order" — a snapshot, not a notification. */
export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending confirmation',
  confirmed: 'Confirmed',
  preparing: 'Being prepared',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const HELP =
  'Send "hi" to see the menu, "1" to shop, "2" to track your last order, or "3" to reach us.';
