/**
 * Digits-only form of a phone number, so "+233 24 123 4567" and
 * "233241234567" are treated as the same number regardless of how a
 * merchant happens to type it.
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

const AUTH_EMAIL_DOMAIN = 'phone.orderflow.internal';

/**
 * Firebase Auth still needs an email under the hood, but a merchant who
 * signs up with a phone number never sees or types one — this derives a
 * deterministic, non-deliverable one from the normalized phone, so
 * createUserWithEmailAndPassword/signInWithEmailAndPassword work unchanged
 * with no separate lookup, no Cloud Function, and no phone-index collection.
 */
export function phoneToAuthEmail(phone: string): string {
  return `${normalizePhone(phone)}@${AUTH_EMAIL_DOMAIN}`;
}
