import { httpsCallable } from 'firebase/functions';
import { limit, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, featureFlagRef, featureFlagsRef, functions, platformLogsRef } from '@/firebase';
import { callWithRetry } from '@/utils/callWithRetry';
import type { MerchantSummary, PlatformMetrics } from '@/types';

// ---- cross-tenant reads/writes: always through a callable, never a direct
// Firestore rule, so a rules mistake can never leak merchant tenant data.
// Every one of these is safe to retry on a transient failure: the reads are
// pure, and suspend/unsuspend/delete are all idempotent (suspending an
// already-suspended org, or re-running a delete whose cleanup steps already
// happened, is a no-op either way). ----

const getPlatformMetricsCallable = httpsCallable<void, PlatformMetrics>(functions, 'getPlatformMetrics');
export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  const result = await callWithRetry(() => getPlatformMetricsCallable());
  return result.data;
}

interface ListMerchantsResult {
  merchants: MerchantSummary[];
  nextCursor: string | null;
}
const listMerchantsCallable = httpsCallable<{ cursor?: string; pageSize?: number }, ListMerchantsResult>(
  functions,
  'listMerchants',
);
export async function listMerchants(cursor?: string, pageSize = 25): Promise<ListMerchantsResult> {
  const result = await callWithRetry(() => listMerchantsCallable({ cursor, pageSize }));
  return result.data;
}

const suspendMerchantCallable = httpsCallable<{ orgId: string; reason?: string }, { ok: true }>(
  functions,
  'suspendMerchant',
);
export async function suspendMerchant(orgId: string, reason?: string) {
  await callWithRetry(() => suspendMerchantCallable({ orgId, reason }));
}

const unsuspendMerchantCallable = httpsCallable<{ orgId: string }, { ok: true }>(functions, 'unsuspendMerchant');
export async function unsuspendMerchant(orgId: string) {
  await callWithRetry(() => unsuspendMerchantCallable({ orgId }));
}

const deleteMerchantCallable = httpsCallable<{ orgId: string; confirmName: string }, { ok: true }>(
  functions,
  'deleteMerchant',
);
export async function deleteMerchant(orgId: string, confirmName: string) {
  await callWithRetry(() => deleteMerchantCallable({ orgId, confirmName }));
}

// ---- platform-only config/audit data: no merchant tenant data lives here,
// so a direct rule-gated Firestore read/write is fine (see firestore.rules). ----

export const platformLogsQuery = () => query(platformLogsRef(), orderBy('createdAt', 'desc'), limit(200));

export const featureFlagsQuery = () => query(featureFlagsRef());

export function setFeatureFlag(flagId: string, enabled: boolean, description?: string) {
  return setDoc(
    featureFlagRef(flagId),
    {
      enabled,
      ...(description !== undefined ? { description } : {}),
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.email ?? null,
    } as never,
    { merge: true },
  );
}

