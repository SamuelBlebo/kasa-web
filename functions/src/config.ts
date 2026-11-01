import { defineSecret, defineString } from 'firebase-functions/params';
import { setGlobalOptions } from 'firebase-functions/v2';

/** Keep functions close to the merchants they serve. */
export const REGION = 'europe-west1';

setGlobalOptions({ region: REGION, maxInstances: 20, memory: '256MiB' });

/**
 * WHATSAPP_VERIFY_TOKEN and META_APP_SECRET both live on the Cloudflare
 * Worker now (see worker/), set via `wrangler secret put` — the inbound
 * webhook AND the WhatsApp Embedded Signup exchange both run there, not
 * here. Nothing in functions/ needs a Meta credential at all.
 */
export const GRAPH_VERSION = defineString('GRAPH_VERSION', { default: 'v21.0' });

/**
 * Stripe/Paystack prep — names settled so a real integration can bind them
 * to changePlan/billingWebhook's `secrets` option later (see
 * http/billing.ts). Deliberately NOT bound to any function yet: Cloud
 * Functions v2 fails to deploy a function whose bound secret doesn't exist
 * in Secret Manager, and none of these do until real keys are provisioned.
 */
export const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
export const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');
export const PAYSTACK_SECRET_KEY = defineSecret('PAYSTACK_SECRET_KEY');

export const SESSION_TTL_MINUTES = 60;
export const TRIAL_DAYS = 14;
