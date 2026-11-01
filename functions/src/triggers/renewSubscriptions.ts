import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import { PAYSTACK_SECRET_KEY } from '../config';
import { PLAN_LOCAL_PRICES, type Currency, type PlanId } from '../billing';
import { chargeAuthorization } from '../paystack/client';
import { db } from '../tenant';

const RENEWAL_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Paystack's own Subscription/Plan objects are deliberately not used —
 * renewal is driven entirely by this org's own `subscription.renewsAt`,
 * re-charging the card on file (`externalSubscriptionId`, actually a saved
 * authorization_code — see billing.ts) via charge_authorization. That keeps
 * renewal timing and failure handling in this app's own logic instead of
 * Paystack's cron and webhook-only model.
 */
export const renewSubscriptions = onSchedule({ schedule: 'every 24 hours', secrets: [PAYSTACK_SECRET_KEY] }, async () => {
  const secretKey = PAYSTACK_SECRET_KEY.value();
  if (!secretKey) return;

  const now = new Date();
  const due = await db()
    .collection('organizations')
    .where('subscription.status', '==', 'active')
    .where('subscription.paymentProvider', '==', 'paystack')
    .where('subscription.renewsAt', '<=', now.toISOString())
    .get();

  for (const org of due.docs) {
    const orgId = org.id;
    const plan = org.get('subscription.plan') as PlanId;
    const currency = (org.get('currency') as Currency) ?? 'GHS';
    const authorizationCode = org.get('subscription.externalSubscriptionId') as string | undefined;
    const email = org.get('subscription.billingEmail') as string | undefined;
    const amount = PLAN_LOCAL_PRICES[plan]?.[currency] ?? 0;

    if (!authorizationCode || !email || amount <= 0) {
      logger.warn('Skipping renewal — missing authorization, email, or price', { orgId, plan });
      continue;
    }

    try {
      await chargeAuthorization(secretKey, { email, amount: Math.round(amount * 100), currency, authorizationCode });
      await org.ref.update({ 'subscription.renewsAt': new Date(now.getTime() + RENEWAL_PERIOD_MS).toISOString() });
      logger.info('Subscription renewed', { orgId, plan });
    } catch (err) {
      // Left `active` rather than immediately downgraded — a merchant should
      // get a chance to update their card, not be silently bumped to Free
      // mid-billing-cycle. past_due is surfaced on Settings > Plan & usage.
      logger.error('Subscription renewal failed', { orgId, plan, err });
      await org.ref.update({ 'subscription.status': 'past_due' });
    }
  }
});
