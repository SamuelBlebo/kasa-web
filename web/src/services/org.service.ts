import { addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { orgRef, orgsRef } from '@/firebase';
import { slugify } from '@/utils/format';
import type { Currency, Organization } from '@/types';

interface CreateOrgInput {
  name: string;
  ownerUid: string;
  phone?: string | null;
  currency: Currency;
}

export async function createOrganization({ name, ownerUid, phone = null, currency }: CreateOrgInput): Promise<string> {
  const ref = await addDoc(orgsRef(), {
    name,
    slug: slugify(name),
    phone,
    category: 'other',
    currency,
    deliveryFee: 0,
    ownerUid,
    memberUids: [ownerUid],
    subscription: {
      plan: 'free',
      status: 'active',
      renewsAt: null,
      currentPeriodStart: null,
      ordersUsedThisPeriod: 0,
      paymentProvider: null,
      externalCustomerId: null,
      externalSubscriptionId: null,
      billingEmail: null,
    },
    whatsapp: {
      connected: false,
      displayPhoneNumber: null,
      phoneNumberId: null,
      wabaId: null,
      verifiedName: null,
      greeting: `Hi! Welcome to ${name}. Reply MENU to see what we have.`,
      connectedAt: null,
    },
    suspended: false,
    suspendedReason: null,
    suspendedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as never);

  return ref.id;
}

export function updateOrganization(orgId: string, patch: Partial<Organization>) {
  return updateDoc(orgRef(orgId), { ...patch, updatedAt: serverTimestamp() } as never);
}
