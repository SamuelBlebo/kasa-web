import type { Timestamp } from 'firebase/firestore';
import type { Timestamps } from './common';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

/** Sequential happy path. Cancellation is a side branch, not a step in it. */
export const ORDER_FLOW: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'out_for_delivery',
  'delivered',
];

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface OrderStatusEvent {
  status: OrderStatus;
  changedAt: Timestamp;
}

export interface Order extends Timestamps {
  number: number;
  customerId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  currency: string;
  status: OrderStatus;
  channel: 'whatsapp' | 'manual';
  note: string | null;
  riderName: string | null;
  riderPhone: string | null;
  estimatedDeliveryAt: Timestamp | null;
  /** Every status this order has passed through, oldest first — missing/absent on an order placed before this field existed. */
  statusHistory?: OrderStatusEvent[];
}
