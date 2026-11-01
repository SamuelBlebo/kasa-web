import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, googleProvider, userRef } from '@/firebase';
import { createOrganization } from './org.service';
import { detectCurrency } from '@/utils/detectCurrency';
import { phoneToAuthEmail } from '@/utils/phone';
import type { LoginInput, OnboardingInput, PhoneLoginInput, RegisterInput } from '@/utils/validation';

/** Email-tab sign-in — the path platform staff use, provisioned out-of-band with a real email. */
export async function signIn({ email, password }: LoginInput) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

/** Phone-tab sign-in — what every merchant actually uses. No lookup: the same phone always maps to the same synthetic email. */
export async function signInWithPhone({ phone, password }: PhoneLoginInput) {
  return signIn({ email: phoneToAuthEmail(phone), password });
}

/**
 * Creates the tenant and the profile that links a Firebase Auth user to it.
 * The org's market (and therefore plan currency) is never asked for either —
 * it's guessed from the browser's timezone via detectCurrency().
 */
async function provisionTenant(
  user: User,
  { fullName, businessName, phone }: { fullName: string; businessName: string; phone?: string | null },
) {
  const orgId = await createOrganization({
    name: businessName,
    ownerUid: user.uid,
    phone: phone || null,
    currency: detectCurrency(),
  });

  await setDoc(userRef(user.uid), {
    uid: user.uid,
    email: user.email ?? '',
    fullName,
    photoURL: user.photoURL,
    orgId,
    role: 'owner',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as never);

  return orgId;
}

/**
 * Signup asks for a phone and a password, nothing else identity-related —
 * phoneToAuthEmail derives the Firebase Auth email Firestore/Auth still
 * need internally, so there's no separate account-linking step and no
 * server round-trip before the account exists.
 */
export async function registerMerchant(input: RegisterInput) {
  const { user } = await createUserWithEmailAndPassword(auth, phoneToAuthEmail(input.phone), input.password);
  await updateProfile(user, { displayName: input.fullName });
  await provisionTenant(user, { fullName: input.fullName, businessName: input.businessName, phone: input.phone });
  return user;
}

/**
 * Google only ever gives us an identity, never a business name, so a
 * first-time Google user lands with a profile-less auth account. The caller
 * (ProtectedRoute) routes them to /onboarding to finish provisioning via
 * completeOnboarding below.
 */
export async function signInWithGoogle() {
  const credential = await signInWithPopup(auth, googleProvider);
  return credential.user;
}

export async function completeOnboarding(user: User, input: OnboardingInput) {
  return provisionTenant(user, {
    fullName: user.displayName ?? user.email ?? 'Owner',
    businessName: input.businessName,
    phone: input.phone,
  });
}

export function signOutMerchant() {
  return signOut(auth);
}
