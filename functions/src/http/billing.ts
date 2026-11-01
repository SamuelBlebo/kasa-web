import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { z } from 'zod';
import { PAYSTACK_SECRET_KEY } from '../config';
import { PLAN_LOCAL_PRICES, type Currency, type PlanId } from '../billing';
import { initializeTransaction, verifyPaystackSignature } from '../paystack/client';
import { orgRef } from '../tenant';
import { requireAdmin } from './guards';

export const changePlanInput = z.object({
  plan: z.enum(['free', 'starter', 'growth', 'pro']),
});

/** 30 days, not calendar-month-aware — matches how `renewsAt` has always been described ("YYYY-MM-DD" issued from the last successful charge). */
const RENEWAL_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * The only way an org's plan changes — firestore.rules blocks a client from
 * writing `subscription.*` directly, so a merchant can't grant themselves a
 * paid tier for free. Downgrading to Free needs no payment, applies
 * immediately, and is also how a merchant cancels a paid subscription — it
 * clears paymentProvider, so renewSubscriptions.ts never charges this org
 * again. Upgrading to a paid tier starts a Paystack checkout instead;
 * `subscription.plan` only actually moves once billingWebhook below
 * confirms a real payment, never here.
 */
export const changePlan = onCall({ secrets: [PAYSTACK_SECRET_KEY] }, async (request) => {
  const { orgId } = await requireAdmin(request.auth);
  const parsed = changePlanInput.safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Choose a valid plan.');

  const { plan } = parsed.data;

  if (plan === 'free') {
    await orgRef(orgId).update({
      'subscription.plan': 'free',
      'subscription.status': 'active',
      'subscription.renewsAt': null,
      'subscription.paymentProvider': null,
      'subscription.externalCustomerId': null,
      'subscription.externalSubscriptionId': null,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { ok: true as const, checkoutUrl: null };
  }

  const secretKey = PAYSTACK_SECRET_KEY.value();
  if (!secretKey) {
    logger.info('Plan upgrade requested with no payment provider configured', { orgId, plan });
    throw new HttpsError(
      'unimplemented',
      'Payment processing is not connected yet. Add a Paystack secret key to enable paid plan upgrades.',
    );
  }

  const email = request.auth?.token.email as string | undefined;
  if (!email) {
    throw new HttpsError('failed-precondition', 'Your account needs an email on file before you can pay by card.');
  }

  const org = await orgRef(orgId).get();
  const currency = (org.get('currency') as Currency) ?? 'GHS';
  const amount = PLAN_LOCAL_PRICES[plan as PlanId][currency];
  if (!amount || amount <= 0) {
    throw new HttpsError('internal', 'That plan has no price configured for your market yet.');
  }

  const projectId = process.env.GCLOUD_PROJECT;
  const { authorization_url: checkoutUrl, reference } = await initializeTransaction(secretKey, {
    email,
    // Paystack takes amounts in the smallest currency unit (kobo/pesewas/cents) — all four currencies here use 2 decimals, so ×100 uniformly.
    amount: Math.round(amount * 100),
    currency,
    callbackUrl: `https://${projectId}.web.app/settings?paystack=return`,
    metadata: { orgId, plan },
  });

  logger.info('Paystack checkout initialized', { orgId, plan, reference });
  return { ok: true as const, checkoutUrl };
});

/**
 * Paystack's delivery for `charge.success` (a checkout completed — upgrade
 * the plan) — verified via HMAC-SHA512 over the raw body before anything in
 * it is trusted, same shape of check the WhatsApp webhook used to do with
 * X-Hub-Signature-256. Acknowledges first, same reasoning as that webhook:
 * Paystack retries anything not answered quickly, so failures should surface
 * in logs, not as repeated deliveries.
 */
export const billingWebhook = onRequest({ secrets: [PAYSTACK_SECRET_KEY] }, async (req, res) => {
  const raw = (req as unknown as { rawBody?: Buffer }).rawBody;
  const secretKey = PAYSTACK_SECRET_KEY.value();
  if (!raw || !secretKey || !verifyPaystackSignature(raw, req.get('x-paystack-signature'), secretKey)) {
    logger.warn('Rejected billing webhook with bad signature');
    res.status(401).send('Invalid signature');
    return;
  }

  res.status(200).send('OK');

  try {
    const event = req.body as { event?: string; data?: Record<string, unknown> };
    if (event.event === 'charge.success' && event.data) {
      await handleChargeSuccess(event.data);
    }
  } catch (err) {
    logger.error('Billing webhook processing failed', err);
  }
});

async function handleChargeSuccess(data: Record<string, unknown>): Promise<void> {
  const metadata = data.metadata as { orgId?: string; plan?: PlanId } | undefined;
  const orgId = metadata?.orgId;
  const plan = metadata?.plan;
  if (!orgId || !plan) {
    logger.warn('charge.success with no orgId/plan in metadata — ignoring', { reference: data.reference });
    return;
  }

  const authorization = data.authorization as { authorization_code?: string } | undefined;
  const customer = data.customer as { customer_code?: string; email?: string } | undefined;

  await orgRef(orgId).update({
    'subscription.plan': plan,
    'subscription.status': 'active',
    'subscription.renewsAt': new Date(Date.now() + RENEWAL_PERIOD_MS).toISOString(),
    'subscription.paymentProvider': 'paystack',
    'subscription.externalCustomerId': customer?.customer_code ?? null,
    // The saved card, re-charged monthly by renewSubscriptions.ts — not a Paystack Subscription object's code.
    'subscription.externalSubscriptionId': authorization?.authorization_code ?? null,
    'subscription.billingEmail': customer?.email ?? null,
    updatedAt: FieldValue.serverTimestamp(),
  });

  logger.info('Subscription activated via Paystack', { orgId, plan });
}
