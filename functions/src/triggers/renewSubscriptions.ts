import { logger } from 'firebase-functions/v2';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { chargeAuthorization } from '../billing/paystack';
import { PLANS } from '../billing/plans';
import { PAYSTACK_SECRET_KEY } from '../config';
import type { PlanId } from '../domain/model';
import { db } from '../tenant';

/**
 * Re-charges the saved Paystack authorization every 30 days (ported from
 * OrderFlow). A failed charge marks the subscription past_due; the merchant
 * keeps working and is asked to pay.
 */
const RENEWAL_MS = 30 * 24 * 60 * 60 * 1000;

export const renewSubscriptions = onSchedule({ schedule: 'every 24 hours', secrets: [PAYSTACK_SECRET_KEY] }, async () => {
  const secretKey = PAYSTACK_SECRET_KEY.value();
  if (!secretKey || secretKey === 'unset') return;
  const now = new Date();
  const due = await db()
    .collection('organizations')
    .where('subscription.status', '==', 'active')
    .where('subscription.paymentProvider', '==', 'paystack')
    .where('subscription.renewsAt', '<=', now.toISOString())
    .get();

  for (const org of due.docs) {
    const plan = org.get('subscription.plan') as PlanId;
    const authorizationCode = org.get('subscription.externalSubscriptionId') as string | undefined;
    const email = org.get('subscription.billingEmail') as string | undefined;
    const amount = PLANS[plan]?.priceMinor ?? 0;
    if (!authorizationCode || !email || amount <= 0) {
      logger.warn('Skipping renewal: no saved card/MoMo authorization', { orgId: org.id, plan });
      await org.ref.update({ 'subscription.status': 'past_due' });
      continue;
    }
    try {
      await chargeAuthorization(secretKey, { email, amount, currency: 'GHS', authorizationCode });
      await org.ref.update({ 'subscription.renewsAt': new Date(now.getTime() + RENEWAL_MS).toISOString() });
    } catch (err) {
      logger.error('Renewal failed', { orgId: org.id, err });
      await org.ref.update({ 'subscription.status': 'past_due' });
    }
  }
});
