const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Those details do not match an account.',
  'auth/user-not-found': 'No account found with those details.',
  'auth/wrong-password': 'That password is not right.',
  'auth/email-already-in-use': 'That phone number already has an account. Sign in instead.',
  'auth/weak-password': 'Choose a password with at least 8 characters.',
  'auth/too-many-requests': 'Too many attempts. Wait a minute, then try again.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled.',
  'auth/popup-blocked': 'Your browser blocked the sign-in popup. Allow popups and try again.',
  'auth/account-exists-with-different-credential':
    'That email already has an account using a different sign-in method.',
  'permission-denied': 'This data belongs to another business.',
};

/** Turns a thrown Firebase error into something a merchant can act on. */
export function toMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String((error as { code: string }).code);
    if (MESSAGES[code]) return MESSAGES[code];
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Try again.';
}
