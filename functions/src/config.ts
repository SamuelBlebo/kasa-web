import { defineSecret, defineString } from 'firebase-functions/params';
import { setGlobalOptions } from 'firebase-functions/v2';

/** Closest Firebase region to Ghana with full Functions v2 support. */
export const REGION = 'europe-west1';

setGlobalOptions({ region: REGION, maxInstances: 20, memory: '256MiB' });

export const GRAPH_VERSION = defineString('GRAPH_VERSION', { default: 'v21.0' });
/** Public Meta App ID — also used by the web app's Embedded Signup button. */
export const META_APP_ID = defineString('META_APP_ID', { default: '' });
/** Public URL of the web app, for Paystack's return link. */
export const APP_URL = defineString('APP_URL', { default: '' });

/**
 * Secrets. A function that binds a secret will not deploy until the secret
 * exists in Secret Manager — set all three before the first deploy, even
 * with placeholder values (see README).
 */
export const META_APP_SECRET = defineSecret('META_APP_SECRET');
export const WHATSAPP_VERIFY_TOKEN = defineSecret('WHATSAPP_VERIFY_TOKEN');
export const PAYSTACK_SECRET_KEY = defineSecret('PAYSTACK_SECRET_KEY');

export const SESSION_TTL_MINUTES = 120;
/** Matches web/src/utils/phone.ts — phone sign-ups get this synthetic email. */
export const PHONE_AUTH_EMAIL_DOMAIN = 'phone.kasa.internal';
