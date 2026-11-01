import { HttpsError } from 'firebase-functions/v2/https';
import { db } from '../tenant';

export type AuthInfo = { uid: string; token: Record<string, unknown> } | undefined;

export function requireAuth(auth: AuthInfo) {
  if (!auth?.uid) throw new HttpsError('unauthenticated', 'Sign in first.');
  return auth;
}

/**
 * orgId and role live on the caller's /users/{uid} Firestore document — the
 * same one the web app's signup flow writes and Firestore rules read from
 * (see firestore.rules' `profile()` helper). Custom claims are not used here,
 * so tenancy has exactly one source of truth across the web app and these
 * functions.
 */
export async function requireOrg(auth: AuthInfo) {
  const user = requireAuth(auth);
  const profile = await db().collection('users').doc(user.uid).get();
  const orgId = profile.get('orgId') as string | undefined;
  if (!orgId) throw new HttpsError('failed-precondition', 'This account has no business yet.');
  return { uid: user.uid, orgId, role: (profile.get('role') as string) ?? 'staff' };
}

export async function requireAdmin(auth: AuthInfo) {
  const ctx = await requireOrg(auth);
  if (!['owner', 'admin'].includes(ctx.role)) {
    throw new HttpsError('permission-denied', 'Only owners and admins can do this.');
  }
  return ctx;
}

/**
 * OrderFlow staff, not a merchant — a completely separate grant from
 * orgId/role, checked the same way firestore.rules' `isPlatformAdmin()`
 * checks it (document existence in `platformAdmins/{uid}`, provisioned
 * out-of-band, never self-serve). A user can be a platform admin with no
 * organization at all.
 */
export async function requirePlatformAdmin(auth: AuthInfo) {
  const user = requireAuth(auth);
  const admin = await db().collection('platformAdmins').doc(user.uid).get();
  if (!admin.exists) throw new HttpsError('permission-denied', 'Platform admin access required.');
  return { uid: user.uid, email: (auth?.token.email as string | undefined) ?? null };
}
