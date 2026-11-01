import { orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { customerRef, customersRef } from '@/firebase';
import type { Customer } from '@/types';

export const customersQuery = (orgId: string) =>
  query(customersRef(orgId), orderBy('lastOrderAt', 'desc'));

/** At or above this many orders, a customer counts as "repeat" on the dashboard. */
export const REPEAT_CUSTOMER_MIN_ORDERS = 2;

export function isRepeatCustomer(customer: Pick<Customer, 'orderCount'>): boolean {
  return customer.orderCount >= REPEAT_CUSTOMER_MIN_ORDERS;
}

/** The only field a merchant can set directly — everything else comes from WhatsApp activity. */
export function updateCustomerNote(orgId: string, customerId: string, note: string | null) {
  return updateDoc(customerRef(orgId, customerId), { note, updatedAt: serverTimestamp() } as never);
}
