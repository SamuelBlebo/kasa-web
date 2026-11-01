import { isRepeatCustomer } from '@/services';
import type { Customer, Order, WithId } from '@/types';

export type SalesPeriod = 'daily' | 'weekly' | 'monthly';

export interface SalesBucket {
  key: string;
  label: string;
  revenue: number;
  /** All orders placed in this bucket, cancelled included. */
  orders: number;
  /** Orders that actually count toward revenue — excludes cancelled. */
  paidOrders: number;
}

const PERIOD_CONFIG: Record<SalesPeriod, { buckets: number; unit: 'day' | 'week' | 'month' }> = {
  daily: { buckets: 14, unit: 'day' },
  weekly: { buckets: 12, unit: 'week' },
  monthly: { buckets: 12, unit: 'month' },
};

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Monday-start week, so a week never splits across a weekend. */
function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return x;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function bucketStartFor(period: SalesPeriod, now: Date, stepsAgo: number): Date {
  const unit = PERIOD_CONFIG[period].unit;
  if (unit === 'day') return startOfDay(addDays(now, -stepsAgo));
  if (unit === 'week') return startOfWeek(addDays(now, -stepsAgo * 7));
  return startOfMonth(addMonths(now, -stepsAgo));
}

function labelFor(period: SalesPeriod, start: Date): string {
  if (period === 'monthly') return start.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
  return start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function keyFor(period: SalesPeriod, start: Date): string {
  if (period === 'monthly') return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
  return start.toISOString().slice(0, 10);
}

/** The earliest moment a period's window covers — orders before this fall outside every bucket. */
export function periodStart(period: SalesPeriod, now = new Date()): Date {
  return bucketStartFor(period, now, PERIOD_CONFIG[period].buckets - 1);
}

export function ordersInPeriod<T extends Pick<Order, 'createdAt'>>(
  orders: T[],
  period: SalesPeriod,
  now = new Date(),
): T[] {
  const start = periodStart(period, now);
  return orders.filter((o) => {
    const created = o.createdAt?.toDate?.();
    return created !== undefined && created >= start;
  });
}

/**
 * Buckets orders into fixed-width periods ending today, filling gaps with
 * zero so the chart always shows a full, even axis — not just days that had
 * sales. Revenue excludes cancelled orders; `orders` counts every one, same
 * convention the merchant dashboard already uses.
 */
export function bucketSales(
  orders: Array<Pick<Order, 'total' | 'status' | 'createdAt'>>,
  period: SalesPeriod,
  now = new Date(),
): SalesBucket[] {
  const cfg = PERIOD_CONFIG[period];
  const starts: Date[] = [];
  for (let i = cfg.buckets - 1; i >= 0; i--) starts.push(bucketStartFor(period, now, i));

  const buckets: SalesBucket[] = starts.map((start) => ({
    key: keyFor(period, start),
    label: labelFor(period, start),
    revenue: 0,
    orders: 0,
    paidOrders: 0,
  }));

  const firstStart = starts[0];

  for (const order of orders) {
    const created = order.createdAt?.toDate?.();
    if (!created || created < firstStart) continue;

    let index: number;
    if (cfg.unit === 'day') {
      index = Math.floor((startOfDay(created).getTime() - firstStart.getTime()) / DAY_MS);
    } else if (cfg.unit === 'week') {
      index = Math.floor((startOfWeek(created).getTime() - firstStart.getTime()) / (7 * DAY_MS));
    } else {
      index =
        (created.getFullYear() - firstStart.getFullYear()) * 12 + (created.getMonth() - firstStart.getMonth());
    }
    if (index < 0 || index >= buckets.length) continue;

    buckets[index].orders += 1;
    if (order.status !== 'cancelled') {
      buckets[index].revenue += order.total;
      buckets[index].paidOrders += 1;
    }
  }

  return buckets;
}

/** How many of the distinct customers who ordered in this window are, overall, repeat customers. */
export function countReturningCustomers(
  ordersInWindow: Array<Pick<Order, 'customerId'>>,
  customers: Array<WithId<Pick<Customer, 'orderCount'>>>,
): number {
  const byId = new Map(customers.map((c) => [c.id, c]));
  const distinctCustomerIds = new Set(ordersInWindow.map((o) => o.customerId));
  let count = 0;
  for (const id of distinctCustomerIds) {
    const customer = byId.get(id);
    if (customer && isRepeatCustomer(customer)) count += 1;
  }
  return count;
}

export interface ProductSalesSummary {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
}

/** Ranked by units sold. Cancelled orders never shipped, so they don't count as sales. */
export function bestSellingProducts(
  ordersInWindow: Array<Pick<Order, 'items' | 'status'>>,
  limit = 5,
): ProductSalesSummary[] {
  const byProduct = new Map<string, ProductSalesSummary>();
  for (const order of ordersInWindow) {
    if (order.status === 'cancelled') continue;
    for (const item of order.items) {
      const existing = byProduct.get(item.productId);
      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += item.price * item.quantity;
      } else {
        byProduct.set(item.productId, {
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          revenue: item.price * item.quantity,
        });
      }
    }
  }
  return [...byProduct.values()].sort((a, b) => b.quantity - a.quantity).slice(0, limit);
}
