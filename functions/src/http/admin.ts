import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions/v2';
import { z } from 'zod';
import { db, orgRef, whatsappAccountRef } from '../tenant';
import { PLAN_PRICES_USD, type PlanId } from '../billing';
import { requirePlatformAdmin } from './guards';

interface LogEventInput {
  action: string;
  actorUid: string;
  actorEmail: string | null;
  targetOrgId?: string | null;
  targetOrgName?: string | null;
  detail?: string | null;
}

/** Every suspend/unsuspend/delete lands here — the audit trail platform admins read on Logs. */
async function logPlatformEvent(input: LogEventInput) {
  await db()
    .collection('platformLogs')
    .add({
      action: input.action,
      actorUid: input.actorUid,
      actorEmail: input.actorEmail,
      targetOrgId: input.targetOrgId ?? null,
      targetOrgName: input.targetOrgName ?? null,
      detail: input.detail ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });
}

/**
 * Every number here reads real Firestore state at call time — nothing is
 * pre-aggregated, since a platform admin's own audience is small enough that
 * the extra reads cost nothing. "Active" is deliberately "not suspended"
 * rather than folding in subscription.status too: combining two equality
 * filters would need a composite index, and since virtually every org is
 * status "active" today (no live cancellation flow exists yet — see
 * changePlan), suspension alone is already a faithful proxy.
 */
export const getPlatformMetrics = onCall(async (request) => {
  await requirePlatformAdmin(request.auth);

  const orgsCol = db().collection('organizations');
  const [totalSnap, activeOrgsSnap, cancelledSnap, ordersCountSnap] = await Promise.all([
    orgsCol.count().get(),
    orgsCol.where('suspended', '==', false).get(),
    orgsCol.where('subscription.status', '==', 'cancelled').count().get(),
    db().collectionGroup('orders').count().get(),
  ]);

  const totalMerchants = totalSnap.data().count;
  const activeMerchants = activeOrgsSnap.size;
  const cancelledMerchants = cancelledSnap.data().count;
  const ordersProcessed = ordersCountSnap.data().count;

  const mrr = activeOrgsSnap.docs
    .filter((doc) => doc.get('subscription.status') === 'active')
    .reduce((sum, doc) => sum + (PLAN_PRICES_USD[(doc.get('subscription.plan') as PlanId) ?? 'free'] ?? 0), 0);

  // Cancelled ÷ total, not a trailing-30-day rate — see PlatformMetrics.churnRate on the web side.
  const churnRate = totalMerchants > 0 ? cancelledMerchants / totalMerchants : 0;

  return { totalMerchants, activeMerchants, mrr, ordersProcessed, churnRate };
});

const listMerchantsInput = z.object({
  cursor: z.string().optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
});

export const listMerchants = onCall(async (request) => {
  await requirePlatformAdmin(request.auth);
  const parsed = listMerchantsInput.safeParse(request.data ?? {});
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Invalid pagination input.');
  const pageSize = parsed.data.pageSize ?? 25;

  let query = db().collection('organizations').orderBy('createdAt', 'desc').limit(pageSize);
  if (parsed.data.cursor) {
    const cursorDoc = await orgRef(parsed.data.cursor).get();
    if (cursorDoc.exists) query = query.startAfter(cursorDoc);
  }

  const snap = await query.get();
  const merchants = snap.docs.map((doc) => ({
    id: doc.id,
    name: (doc.get('name') as string) ?? 'Unnamed',
    plan: (doc.get('subscription.plan') as PlanId) ?? 'free',
    status: (doc.get('subscription.status') as string) ?? 'active',
    suspended: (doc.get('suspended') as boolean) ?? false,
    createdAt: doc.get('createdAt') ?? null,
  }));

  return {
    merchants,
    nextCursor: snap.docs.length === pageSize ? snap.docs[snap.docs.length - 1].id : null,
  };
});

const suspendMerchantInput = z.object({
  orgId: z.string().min(1),
  reason: z.string().max(500).optional(),
});

export const suspendMerchant = onCall(async (request) => {
  const admin = await requirePlatformAdmin(request.auth);
  const parsed = suspendMerchantInput.safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Missing organization id.');
  const { orgId, reason } = parsed.data;

  const orgSnap = await orgRef(orgId).get();
  if (!orgSnap.exists) throw new HttpsError('not-found', 'That merchant does not exist.');

  await orgRef(orgId).update({
    suspended: true,
    suspendedReason: reason ?? null,
    suspendedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await logPlatformEvent({
    action: 'merchant.suspended',
    actorUid: admin.uid,
    actorEmail: admin.email,
    targetOrgId: orgId,
    targetOrgName: (orgSnap.get('name') as string) ?? null,
    detail: reason ?? null,
  });

  return { ok: true as const };
});

const unsuspendMerchantInput = z.object({ orgId: z.string().min(1) });

export const unsuspendMerchant = onCall(async (request) => {
  const admin = await requirePlatformAdmin(request.auth);
  const parsed = unsuspendMerchantInput.safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Missing organization id.');
  const { orgId } = parsed.data;

  const orgSnap = await orgRef(orgId).get();
  if (!orgSnap.exists) throw new HttpsError('not-found', 'That merchant does not exist.');

  await orgRef(orgId).update({
    suspended: false,
    suspendedReason: null,
    suspendedAt: null,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await logPlatformEvent({
    action: 'merchant.unsuspended',
    actorUid: admin.uid,
    actorEmail: admin.email,
    targetOrgId: orgId,
    targetOrgName: (orgSnap.get('name') as string) ?? null,
  });

  return { ok: true as const };
});

const deleteMerchantInput = z.object({
  orgId: z.string().min(1),
  /** The merchant's exact business name, typed by the admin — the standard "type to confirm" guard for an irreversible action. */
  confirmName: z.string().min(1),
});

/**
 * Irreversible: recursively deletes the org's entire Firestore subtree
 * (products, orders, customers, everything), its uploaded files, its
 * WhatsApp number mapping, and unlinks any /users/{uid} profiles pointing at
 * it (those accounts still work — they just land back at onboarding, same as
 * a fresh signup). Firebase Auth accounts themselves are left alone.
 */
export const deleteMerchant = onCall(async (request) => {
  const admin = await requirePlatformAdmin(request.auth);
  const parsed = deleteMerchantInput.safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Missing organization id.');
  const { orgId, confirmName } = parsed.data;

  const orgSnap = await orgRef(orgId).get();
  if (!orgSnap.exists) throw new HttpsError('not-found', 'That merchant does not exist.');

  const actualName = (orgSnap.get('name') as string) ?? '';
  if (confirmName.trim().toLowerCase() !== actualName.trim().toLowerCase()) {
    throw new HttpsError('failed-precondition', 'Type the exact business name to confirm deletion.');
  }

  const phoneNumberId = orgSnap.get('whatsapp.phoneNumberId') as string | undefined;

  const users = await db().collection('users').where('orgId', '==', orgId).get();
  const userBatch = db().batch();
  users.docs.forEach((doc) => userBatch.delete(doc.ref));
  await userBatch.commit();

  if (phoneNumberId) {
    await whatsappAccountRef(phoneNumberId)
      .delete()
      .catch((err) => logger.warn('Could not free WhatsApp number during merchant deletion', { orgId, err }));
  }

  await getStorage()
    .bucket()
    .deleteFiles({ prefix: `organizations/${orgId}/` })
    .catch((err) => logger.warn('Could not delete all storage files during merchant deletion', { orgId, err }));

  await db().recursiveDelete(orgRef(orgId));

  await logPlatformEvent({
    action: 'merchant.deleted',
    actorUid: admin.uid,
    actorEmail: admin.email,
    targetOrgId: orgId,
    targetOrgName: actualName,
    detail: `${users.size} linked user account(s) unlinked`,
  });

  return { ok: true as const };
});
