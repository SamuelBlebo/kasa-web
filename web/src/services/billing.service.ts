import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase';
import { callWithRetry } from '@/utils/callWithRetry';
import type { PlanId } from '@/types';

interface ChangePlanResult {
  ok: true;
  checkoutUrl: string | null;
}

const changePlanCallable = httpsCallable<{ plan: PlanId }, ChangePlanResult>(functions, 'changePlan');

/**
 * Downgrading to Free applies immediately. Upgrading to a paid plan throws
 * until Stripe/Paystack credentials are configured (see
 * functions/src/http/billing.ts) — callers should show that error, not
 * treat it as unexpected.
 */
export async function changePlan(plan: PlanId): Promise<ChangePlanResult> {
  // Safe to retry: a Free downgrade is idempotent, and the paid-plan path
  // always throws "unimplemented" (not retried) rather than charging anyone.
  const result = await callWithRetry(() => changePlanCallable({ plan }));
  return result.data;
}
