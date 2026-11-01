export type PlanId = 'free' | 'starter' | 'growth' | 'pro';
export type Currency = 'GHS' | 'NGN' | 'KES' | 'USD';

/** Mirrors the orderLimit values in web/src/config/plans.ts — keep both in sync. */
export const ORDER_LIMITS: Record<PlanId, number | null> = {
  free: 15,
  starter: 75,
  growth: 300,
  pro: null,
};

/** Mirrors the priceUsd values in web/src/config/plans.ts — used for platform-admin MRR. */
export const PLAN_PRICES_USD: Record<PlanId, number> = {
  free: 0,
  starter: 15,
  growth: 39,
  pro: 89,
};

/**
 * Mirrors localPricing in web/src/config/plans.ts exactly — keep both in
 * sync. This is what changePlan actually charges: never trust a
 * client-supplied amount for a paid upgrade, always look the price up
 * server-side from (plan, org.currency).
 */
export const PLAN_LOCAL_PRICES: Record<PlanId, Record<Currency, number>> = {
  free: { GHS: 0, NGN: 0, KES: 0, USD: 0 },
  starter: { GHS: 50, NGN: 5000, KES: 450, USD: 15 },
  growth: { GHS: 150, NGN: 15000, KES: 1300, USD: 39 },
  pro: { GHS: 350, NGN: 36000, KES: 3000, USD: 89 },
};

function currentPeriodKey(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export interface UsageState {
  plan: PlanId;
  /** "YYYY-MM" to store back onto the org so next month's first order resets the counter. */
  periodKey: string;
  /** Orders placed so far this period, before the order being counted right now. */
  ordersUsedBefore: number;
  limit: number | null;
  overLimit: boolean;
}

/**
 * Reads usage off an org snapshot already fetched inside a transaction and
 * rolls the counter over if the stored period has passed — no scheduled
 * function needed, since the next order placed after month-end naturally
 * starts a fresh count.
 */
export function resolveUsage(org: FirebaseFirestore.DocumentSnapshot, now = new Date()): UsageState {
  const plan = (org.get('subscription.plan') as PlanId) ?? 'free';
  const periodKey = currentPeriodKey(now);
  const storedPeriod = org.get('subscription.currentPeriodStart') as string | undefined;
  const ordersUsedBefore = storedPeriod === periodKey ? ((org.get('subscription.ordersUsedThisPeriod') as number) ?? 0) : 0;
  const limit = ORDER_LIMITS[plan];
  return { plan, periodKey, ordersUsedBefore, limit, overLimit: limit !== null && ordersUsedBefore >= limit };
}
