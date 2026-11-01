import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { GRAPH_VERSION, TRIAL_DAYS } from '../config';
import { db, loadCredentialsForOrg, orgRef, whatsappAccountRef } from '../tenant';
import { sendText } from '../whatsapp/client';
import { connectWhatsappInput, createOrgInput, testMessageInput } from '../types';
import { requireAdmin, requireAuth } from './guards';

/**
 * Alternate tenant-provisioning path, not currently called by the web app —
 * its signup flow creates the organization and /users profile directly via
 * the client SDK (web/src/services/auth.service.ts) instead. Kept for a
 * future server-side signup path; note it stamps orgId/role as custom claims,
 * which nothing else in this codebase reads (Firestore rules and the
 * requireOrg/requireAdmin helpers above both read /users/{uid} instead), and
 * its early-return guard below only recognizes a prior *claims*-based
 * provisioning, not a /users/{uid} document from the real flow.
 */
export const createOrganization = onCall(async (request) => {
  const user = requireAuth(request.auth);
  if (user.token.orgId) {
    return { orgId: user.token.orgId as string };
  }

  const parsed = createOrgInput.safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Check the details you sent.');

  const { businessName, fullName } = parsed.data;
  const org = orgRef(db().collection('organizations').doc().id);
  const trialEndsAt = Timestamp.fromMillis(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  const batch = db().batch();
  batch.set(org, {
    name: businessName,
    country: 'GH',
    currency: 'GHS',
    deliveryFee: 0,
    greeting: `Welcome to ${businessName}. Browse our items and order right here on WhatsApp.`,
    plan: 'trial',
    trialEndsAt,
    whatsappStatus: 'disconnected',
    whatsappPhone: null,
    orderCounter: 0,
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.set(org.collection('members').doc(user.uid), {
    email: request.auth?.token.email ?? null,
    fullName,
    role: 'owner',
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.set(db().collection('users').doc(user.uid), {
    orgId: org.id,
    role: 'owner',
    fullName,
    createdAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  await getAuth().setCustomUserClaims(user.uid, { orgId: org.id, role: 'owner' });
  logger.info('Organization created', { orgId: org.id, uid: user.uid });

  return { orgId: org.id };
});

/**
 * Verifies a token against Meta before storing anything, then claims the
 * phone_number_id in `whatsappAccounts/` so inbound messages find this
 * tenant. `webhookStatus` starts at "pending" — the webhook itself flips it
 * to "verified" the first time Meta actually delivers a message for this
 * number.
 *
 * The Embedded Signup path (WhatsAppPage.tsx's "Connect WhatsApp" button)
 * does NOT go through here — it runs entirely on the Cloudflare Worker (see
 * worker/src/whatsappConnect.ts), since the OAuth code Meta hands back has
 * to be exchanged and the resulting token never needs to pass through this
 * backend at all. This callable is what's left: a lower-level manual-entry
 * path (pasting an existing token), kept for support/scripted use — nothing
 * in the merchant-facing UI calls it anymore.
 */
async function claimWhatsappNumber(
  orgId: string,
  { phoneNumberId, businessAccountId, accessToken }: { phoneNumberId: string; businessAccountId: string; accessToken: string },
): Promise<string> {
  const probe = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION.value()}/${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!probe.ok) {
    throw new HttpsError('invalid-argument', 'Meta rejected that token or phone number ID.');
  }
  const {
    display_phone_number: displayPhone,
    verified_name: verifiedName,
    quality_rating: qualityRating,
  } = (await probe.json()) as { display_phone_number?: string; verified_name?: string; quality_rating?: string };
  if (!displayPhone) throw new HttpsError('invalid-argument', 'Meta did not return a phone number for that id.');

  // A phone number can only ever belong to one tenant.
  const account = whatsappAccountRef(phoneNumberId);
  await db().runTransaction(async (tx) => {
    const existing = await tx.get(account);
    if (existing.exists && existing.get('organizationId') !== orgId) {
      throw new HttpsError('already-exists', 'That number is connected to another business.');
    }
    tx.set(account, {
      organizationId: orgId,
      phoneNumberId,
      businessAccountId,
      displayPhone,
      accessToken,
      webhookStatus: 'pending',
      connectedAt: FieldValue.serverTimestamp(),
    });
    // Non-secret mirror the dashboard reads directly — never the access token.
    tx.update(orgRef(orgId), {
      'whatsapp.connected': true,
      'whatsapp.phoneNumberId': phoneNumberId,
      'whatsapp.wabaId': businessAccountId,
      'whatsapp.displayPhoneNumber': displayPhone,
      'whatsapp.verifiedName': verifiedName ?? null,
      'whatsapp.qualityRating': qualityRating ?? null,
      'whatsapp.connectedAt': FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return displayPhone;
}

export const connectWhatsapp = onCall(async (request) => {
  const { orgId } = await requireAdmin(request.auth);
  const parsed = connectWhatsappInput.safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Check the values you copied.');

  const displayPhone = await claimWhatsappNumber(orgId, parsed.data);
  return { ok: true as const, displayPhone };
});

/**
 * Disconnecting unsubscribes the app from the WABA's webhook notifications
 * (best-effort — Meta rejecting this, e.g. because the token already
 * expired, shouldn't block the merchant from disconnecting on our side) and
 * deletes the credential from `whatsappAccounts/`, which is the only place
 * the access token ever lived — there is nothing left to "revoke" beyond
 * that, since Meta has no separate token-revocation API for this token type.
 * Historical orders/customers are untouched; only the connection itself
 * (and the org's `whatsapp.*` mirror) is cleared.
 */
export const disconnectWhatsapp = onCall(async (request) => {
  const { orgId } = await requireAdmin(request.auth);
  const creds = await loadCredentialsForOrg(orgId);

  if (creds) {
    try {
      const unsubscribe = await fetch(
        `https://graph.facebook.com/${GRAPH_VERSION.value()}/${creds.businessAccountId}/subscribed_apps`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${creds.accessToken}` } },
      );
      if (!unsubscribe.ok) {
        logger.warn('Failed to unsubscribe from WABA notifications on disconnect', {
          orgId,
          status: unsubscribe.status,
        });
      }
    } catch (err) {
      logger.warn('Unsubscribe request failed on disconnect', { orgId, err });
    }
  }

  const batch = db().batch();
  if (creds) batch.delete(whatsappAccountRef(creds.phoneNumberId));
  batch.update(orgRef(orgId), {
    'whatsapp.connected': false,
    'whatsapp.phoneNumberId': null,
    'whatsapp.wabaId': null,
    'whatsapp.displayPhoneNumber': null,
    'whatsapp.verifiedName': null,
    'whatsapp.qualityRating': null,
    'whatsapp.connectedAt': null,
    updatedAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  return { ok: true as const };
});

export const sendTestMessage = onCall(async (request) => {
  const { orgId } = await requireAdmin(request.auth);
  const parsed = testMessageInput.safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Enter a valid phone number.');

  const creds = await loadCredentialsForOrg(orgId);
  if (!creds) throw new HttpsError('failed-precondition', 'Connect a WhatsApp number first.');

  const result = await sendText(
    creds,
    parsed.data.to.replace(/\D/g, ''),
    'Your OrderFlow connection is working. Customers can now order from this number.',
  );
  if (!result.ok) throw new HttpsError('internal', 'WhatsApp would not accept that message.');

  return { ok: true as const };
});
