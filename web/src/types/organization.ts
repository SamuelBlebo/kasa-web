import type { Timestamp } from 'firebase/firestore';
import type { Timestamps } from './common';

export type BusinessCategory =
  | 'fashion'
  | 'beauty'
  | 'food'
  | 'pharmacy'
  | 'electronics'
  | 'books'
  | 'other';

export type PlanId = 'free' | 'starter' | 'growth' | 'pro';

/** Also doubles as the merchant's market for plan pricing — see web/src/config/plans.ts. */
export type Currency = 'GHS' | 'NGN' | 'KES' | 'USD';

/** Set once a real subscription exists — see changePlan in functions/src/http/billing.ts. */
export type PaymentProvider = 'stripe' | 'paystack';

export interface Subscription {
  plan: PlanId;
  status: 'trialing' | 'active' | 'past_due' | 'cancelled';
  renewsAt: string | null;
  /**
   * "YYYY-MM" — the month `ordersUsedThisPeriod` is counting. A plan's order
   * limit lives in web/src/config/plans.ts, not here, so raising a limit
   * never requires touching every org document.
   */
  currentPeriodStart: string | null;
  ordersUsedThisPeriod: number;
  paymentProvider: PaymentProvider | null;
  externalCustomerId: string | null;
  /** For Paystack: the saved card's authorization_code, re-charged monthly — see functions/src/triggers/renewSubscriptions.ts. */
  externalSubscriptionId: string | null;
  /** The email Paystack charged at checkout, reused for renewal — set only once a paid plan is active. */
  billingEmail: string | null;
}

export interface WhatsAppAccount {
  connected: boolean;
  displayPhoneNumber: string | null;
  phoneNumberId: string | null;
  wabaId: string | null;
  verifiedName: string | null;
  greeting: string;
  /** Written with FieldValue.serverTimestamp() — a real Timestamp, not a string. */
  connectedAt: Timestamp | null;
  /** Meta's GREEN/YELLOW/RED/UNKNOWN rating for this number — absent on a connection made before this field existed. */
  qualityRating: string | null;
}

export interface Organization extends Timestamps {
  name: string;
  slug: string;
  phone: string | null;
  category: BusinessCategory;
  currency: Currency;
  deliveryFee: number;
  ownerUid: string;
  memberUids: string[];
  subscription: Subscription;
  whatsapp: WhatsAppAccount;
  /** Set only by suspendMerchant/unsuspendMerchant (platform admin) — a merchant can never write this. */
  suspended: boolean;
  suspendedReason: string | null;
  suspendedAt: Timestamp | null;
}
