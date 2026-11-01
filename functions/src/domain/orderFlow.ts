import type { Fulfilment, OrderLine, OrderStatus } from './model';

/**
 * The only legal description of how an order moves (idea from ShopFlow's
 * order-state.machine.ts). Nothing writes Order.status except
 * services/orders.ts, which asks this table first.
 *
 * One flow for every kind of merchant; the web app only changes the labels
 * (a salon's "in_progress" reads "In progress", a restaurant's "Preparing").
 */
export const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'ready', 'cancelled'],
  in_progress: ['ready', 'completed', 'cancelled'],
  ready: ['out_for_delivery', 'completed', 'cancelled'],
  out_for_delivery: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export const isTerminal = (s: OrderStatus) => TRANSITIONS[s].length === 0;
export const canTransition = (from: OrderStatus, to: OrderStatus) => TRANSITIONS[from].includes(to);

/** The happy-path next step for the one-tap action button. */
export function nextStatus(order: { status: OrderStatus; fulfilment: Fulfilment; lines: OrderLine[] }): OrderStatus | null {
  const servicesOnly = order.lines.every((l) => l.kind === 'service');
  switch (order.status) {
    case 'pending':
      return 'confirmed';
    case 'confirmed':
      return 'in_progress';
    case 'in_progress':
      return servicesOnly || order.fulfilment === 'appointment' || order.fulfilment === 'on_site' ? 'completed' : 'ready';
    case 'ready':
      return order.fulfilment === 'delivery' ? 'out_for_delivery' : 'completed';
    case 'out_for_delivery':
      return 'completed';
    default:
      return null;
  }
}

/** Timestamp field stamped when an order enters a status. */
export const STATUS_TIMESTAMP: Partial<Record<OrderStatus, string>> = {
  confirmed: 'confirmedAt',
  ready: 'readyAt',
  completed: 'completedAt',
  cancelled: 'cancelledAt',
};
