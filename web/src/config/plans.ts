import type { Currency, PlanId } from '@/types';

export interface PlanDefinition {
  id: PlanId;
  name: string;
  /**
   * USD reference price — the anchor `localPricing` is discounted from, and
   * what platform-admin MRR is estimated against (functions/src/billing.ts).
   * Never shown to a merchant directly; what they're actually charged is
   * `localPricing[org.currency]`.
   */
  priceUsd: number;
  /**
   * What a merchant on each market is actually charged, in that market's
   * currency — set by `org.currency`, picked once at signup. Nigeria, Ghana
   * and Kenya are priced well below the USD-equivalent (purchasing-power
   * pricing, same reason most SaaS tools discount emerging markets); USD
   * (everyone else) pays `priceUsd` straight.
   *
   * These are sticker prices reviewed by hand, not computed live off an FX
   * rate — expect them to drift from the "true" converted rate over time and
   * revisit periodically rather than treating them as pegged.
   */
  localPricing: Record<Currency, number>;
  orderLimit: number | null;
  productLimit: number | null;
  features: string[];
}

export const PLAN_ORDER: PlanId[] = ['free', 'starter', 'growth', 'pro'];

/** What a plan actually costs a merchant on `currency`. */
export function getPlanPrice(plan: PlanDefinition, currency: Currency): number {
  return plan.localPricing[currency];
}

/**
 * The single source of truth for what each plan includes. Limits live only
 * here, never copied onto an org document — see Subscription in
 * types/organization.ts. Order limits are mirrored in
 * functions/src/billing.ts for server-side enforcement; keep both in sync.
 */
export const PLAN_CATALOG: Record<PlanId, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Free',
    priceUsd: 0,
    localPricing: { GHS: 0, NGN: 0, KES: 0, USD: 0 },
    orderLimit: 15,
    productLimit: 10,
    features: ['15 orders / month', '10 products', 'WhatsApp ordering', 'Community support'],
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    priceUsd: 15,
    localPricing: { GHS: 50, NGN: 5000, KES: 450, USD: 15 },
    orderLimit: 75,
    productLimit: 50,
    features: ['75 orders / month', '50 products', 'Delivery tracking', 'Email support'],
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    priceUsd: 39,
    localPricing: { GHS: 150, NGN: 15000, KES: 1300, USD: 39 },
    orderLimit: 300,
    productLimit: 200,
    features: ['300 orders / month', '200 products', 'Broadcast promotions', 'Priority support'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceUsd: 89,
    localPricing: { GHS: 350, NGN: 36000, KES: 3000, USD: 89 },
    orderLimit: null,
    productLimit: null,
    features: ['Unlimited orders', 'Unlimited products', 'Broadcast promotions', 'Priority support'],
  },
};
