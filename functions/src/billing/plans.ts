import type { PlanId } from '../domain/model';

/**
 * Plan prices and limits (Ghana only). Mirrored in web/src/config/plans.ts.
 * Going over the order limit never blocks a customer's order — usage is
 * tracked and the merchant is asked to upgrade.
 */
export const PLANS: Record<PlanId, { priceMinor: number; orderLimit: number | null; staffLimit: number; itemLimit: number | null }> = {
  free: { priceMinor: 0, orderLimit: 15, staffLimit: 1, itemLimit: 10 },
  starter: { priceMinor: 5000, orderLimit: 75, staffLimit: 5, itemLimit: 50 },
  growth: { priceMinor: 15000, orderLimit: 300, staffLimit: 10, itemLimit: 200 },
  pro: { priceMinor: 35000, orderLimit: null, staffLimit: 25, itemLimit: null },
};

export function currentPeriodKey(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}
