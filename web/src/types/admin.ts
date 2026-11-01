import type { Timestamp } from 'firebase/firestore';
import type { PlanId } from './organization';

/** Marks a Firebase Auth user as OrderFlow staff. Existence of the doc is the grant — see firestore.rules. */
export interface PlatformAdmin {
  email: string;
  createdAt: Timestamp;
}

/** Computed server-side in getPlatformMetrics — never stored, always fresh. */
export interface PlatformMetrics {
  totalMerchants: number;
  activeMerchants: number;
  /** USD/month, summed across orgs with subscription.status === 'active'. */
  mrr: number;
  ordersProcessed: number;
  /**
   * cancelledMerchants ÷ totalMerchants — a point-in-time ratio, not a
   * trailing-30-day rate, since no historical cohort snapshots exist yet.
   * Stays 0 until real payment cancellations (via a Stripe/Paystack webhook)
   * start setting subscription.status to "cancelled".
   */
  churnRate: number;
}

/** One row in the platform admin's merchant list. */
export interface MerchantSummary {
  id: string;
  name: string;
  plan: PlanId;
  status: string;
  suspended: boolean;
  createdAt: Timestamp | null;
}

/** Written by suspendMerchant/unsuspendMerchant/deleteMerchant/setFeatureFlag — an admin action audit trail. */
export interface PlatformLog {
  action: string;
  actorUid: string;
  actorEmail: string | null;
  targetOrgId: string | null;
  targetOrgName: string | null;
  detail: string | null;
  createdAt: Timestamp;
}

export interface FeatureFlag {
  description: string;
  enabled: boolean;
  updatedAt: Timestamp;
  updatedBy: string | null;
}
