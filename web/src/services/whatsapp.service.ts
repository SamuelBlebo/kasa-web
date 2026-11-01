import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '@/firebase';
import { env } from '@/utils/env';

interface ConnectResult {
  ok: true;
  displayPhone: string;
  qualityRating?: string | null;
}

const connectWhatsappCallable = httpsCallable<
  { phoneNumberId: string; businessAccountId: string; accessToken: string },
  ConnectResult
>(functions, 'connectWhatsapp');

/**
 * The manual, credential-pasting path — kept as a lower-level fallback (see
 * functions/src/http/organizations.ts) for support/scripted use, but
 * nothing in WhatsAppPage calls this anymore; Embedded Signup
 * (exchangeEmbeddedSignupCode below) is the only merchant-facing way in.
 */
export async function connectWhatsapp(input: {
  phoneNumberId: string;
  businessAccountId: string;
  accessToken: string;
}): Promise<ConnectResult> {
  const result = await connectWhatsappCallable(input);
  return result.data;
}

/**
 * The Embedded Signup exchange runs on the Cloudflare Worker, not Cloud
 * Functions (see worker/src/index.ts's `/embedded-signup/exchange`) — the
 * access token it produces never needs to reach this backend at all. Since
 * that's a plain HTTP endpoint with no Firebase callable machinery behind
 * it, the merchant's own ID token is what proves who's asking; the Worker
 * verifies it itself (see worker/src/verifyIdToken.ts) and cross-checks
 * `organizationId` against it rather than trusting the body alone.
 */
export async function exchangeEmbeddedSignupCode(input: {
  code: string;
  organizationId: string;
  phoneNumberId: string;
  businessAccountId: string;
}): Promise<ConnectResult> {
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error('Sign in first.');
  if (!env.whatsappWorkerUrl) throw new Error('WhatsApp connect is not set up yet — contact support.');

  const response = await fetch(`${env.whatsappWorkerUrl}/embedded-signup/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify(input),
  });

  const body = (await response.json().catch(() => ({}))) as { ok?: true; error?: string; displayPhone?: string; qualityRating?: string | null };
  if (!response.ok || !body.ok) throw new Error(body.error ?? 'WhatsApp connect failed. Try again.');

  return { ok: true, displayPhone: body.displayPhone ?? '', qualityRating: body.qualityRating ?? null };
}

const disconnectWhatsappCallable = httpsCallable<void, { ok: true }>(functions, 'disconnectWhatsapp');

export async function disconnectWhatsapp(): Promise<void> {
  await disconnectWhatsappCallable();
}

const sendTestMessageCallable = httpsCallable<{ to: string }, { ok: true }>(functions, 'sendTestMessage');

export async function sendTestMessage(to: string): Promise<void> {
  await sendTestMessageCallable({ to });
}
