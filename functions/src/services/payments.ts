import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import type { MomoNetwork, OrderStatus, PaymentMethod, PaymentState } from '../domain/model';
import { customerRef, db, ordersRef, paymentRefsRef, paymentsRef } from '../tenant';

/**
 * Manual MoMo verification (ShopFlow's payments.service, rebuilt on
 * Firestore). A customer replies with a Transaction ID; it lands here as a
 * "submitted" payment with any red flags attached; a human compares it with
 * the MoMo SMS and verifies or rejects. Verifying a payment that covers the
 * order also confirms a pending order.
 *
 * When MTN MoMo / Telecel Cash / AirtelTigo collection APIs are wired in
 * (payments/providers.ts), they call verifyPayment with by: "provider:mtn"
 * instead of a staff uid — nothing else here changes.
 */

export type PaymentFlag = 'amount_mismatch' | 'duplicate_reference' | 'amount_unknown';

export interface SubmitPaymentInput {
  orgId: string;
  orderId: string;
  method: PaymentMethod;
  network: MomoNetwork | null;
  reference: string | null;
  /** What the customer says they paid; null if they didn't say. */
  amountMinor: number | null;
  payerPhone: string | null;
  source: 'whatsapp' | 'staff';
  by: string;
}

const refKey = (network: MomoNetwork | null, reference: string) => `${network ?? 'any'}_${reference}`;

export async function submitPayment(input: SubmitPaymentInput) {
  const { orgId } = input;
  const orderDoc = ordersRef(orgId).doc(input.orderId);
  const payment = paymentsRef(orgId).doc();
  const refDoc = input.reference ? paymentRefsRef(orgId).doc(refKey(input.network, input.reference)) : null;

  return db().runTransaction(async (tx) => {
    const order = await tx.get(orderDoc);
    if (!order.exists) throw new HttpsError('not-found', 'That order does not exist.');
    const existingRef = refDoc ? await tx.get(refDoc) : null;

    const totalMinor = order.get('totalMinor') as number;
    const paidMinor = (order.get('paidMinor') as number) ?? 0;
    const dueMinor = Math.max(0, totalMinor - paidMinor);

    const flags: PaymentFlag[] = [];
    if (input.amountMinor === null) flags.push('amount_unknown');
    else if (input.amountMinor !== dueMinor) flags.push('amount_mismatch');
    if (existingRef?.exists) flags.push('duplicate_reference');

    const now = Timestamp.now();
    tx.set(payment, {
      orderId: input.orderId,
      orderNumber: order.get('number'),
      customerId: order.get('customerId'),
      customerName: order.get('customerName'),
      method: input.method,
      network: input.network,
      reference: input.reference,
      claimedMinor: input.amountMinor,
      expectedMinor: dueMinor,
      payerPhone: input.payerPhone,
      status: 'submitted',
      flags,
      duplicateOfOrderNumber: existingRef?.exists ? (existingRef.get('orderNumber') as number) : null,
      source: input.source,
      submittedBy: input.by,
      verifiedBy: null,
      verifiedAt: null,
      rejectedReason: null,
      createdAt: now,
      updatedAt: now,
    });
    if (refDoc && !existingRef?.exists) {
      tx.set(refDoc, { paymentId: payment.id, orderId: input.orderId, orderNumber: order.get('number'), createdAt: now });
    }
    if (order.get('paymentState') !== 'paid') {
      tx.update(orderDoc, { paymentState: 'submitted' satisfies PaymentState, updatedAt: now });
    }
    return { paymentId: payment.id, flags, dueMinor, orderNumber: order.get('number') as number };
  });
}

/**
 * Marks a payment verified, adds it to the order's paid amount, credits the
 * customer, and confirms a pending order once it is fully paid.
 */
export async function verifyPayment(orgId: string, paymentId: string, by: string) {
  const ref = paymentsRef(orgId).doc(paymentId);
  return db().runTransaction(async (tx) => {
    const payment = await tx.get(ref);
    if (!payment.exists) throw new HttpsError('not-found', 'That payment does not exist.');
    if (payment.get('status') !== 'submitted') throw new HttpsError('failed-precondition', 'This payment was already handled.');
    const orderDoc = ordersRef(orgId).doc(payment.get('orderId') as string);
    const order = await tx.get(orderDoc);
    if (!order.exists) throw new HttpsError('not-found', 'The order for this payment is gone.');

    const amount = (payment.get('claimedMinor') as number | null) ?? (payment.get('expectedMinor') as number);
    const paidMinor = ((order.get('paidMinor') as number) ?? 0) + amount;
    const totalMinor = order.get('totalMinor') as number;
    const fullyPaid = paidMinor >= totalMinor;
    const now = Timestamp.now();

    tx.update(ref, { status: 'verified', verifiedBy: by, verifiedAt: now, amountMinor: amount, updatedAt: now });
    const orderPatch: Record<string, unknown> = {
      paidMinor,
      paymentState: (fullyPaid ? 'paid' : 'partial') satisfies PaymentState,
      updatedAt: now,
    };
    const confirms = fullyPaid && (order.get('status') as OrderStatus) === 'pending';
    if (confirms) {
      orderPatch.status = 'confirmed';
      orderPatch.confirmedAt = now;
      orderPatch.statusHistory = FieldValue.arrayUnion({ status: 'confirmed', at: now, by, reason: 'Payment verified' });
    }
    tx.update(orderDoc, orderPatch);
    tx.set(customerRef(orgId, order.get('customerId') as string), { totalSpentMinor: FieldValue.increment(amount), updatedAt: now }, { merge: true });

    return {
      amountMinor: amount,
      fullyPaid,
      confirmed: confirms,
      orderNumber: order.get('number') as number,
      customerId: order.get('customerId') as string,
      balanceMinor: Math.max(0, totalMinor - paidMinor),
    };
  });
}

export async function rejectPayment(orgId: string, paymentId: string, by: string, reason: string) {
  const ref = paymentsRef(orgId).doc(paymentId);
  return db().runTransaction(async (tx) => {
    const payment = await tx.get(ref);
    if (!payment.exists) throw new HttpsError('not-found', 'That payment does not exist.');
    if (payment.get('status') !== 'submitted') throw new HttpsError('failed-precondition', 'This payment was already handled.');
    const orderDoc = ordersRef(orgId).doc(payment.get('orderId') as string);
    const order = await tx.get(orderDoc);
    const reference = payment.get('reference') as string | null;
    const refDoc = reference ? paymentRefsRef(orgId).doc(refKey(payment.get('network') as MomoNetwork | null, reference)) : null;
    const refSnap = refDoc ? await tx.get(refDoc) : null;

    const now = Timestamp.now();
    tx.update(ref, { status: 'rejected', rejectedReason: reason, verifiedBy: by, verifiedAt: now, updatedAt: now });
    // Free the reference only if this payment claimed it, so a genuine retry with the same ID still works.
    if (refDoc && refSnap?.exists && refSnap.get('paymentId') === paymentId) tx.delete(refDoc);
    if (order.exists && order.get('paymentState') !== 'paid') {
      const paid = (order.get('paidMinor') as number) ?? 0;
      tx.update(orderDoc, { paymentState: (paid > 0 ? 'partial' : 'unpaid') satisfies PaymentState, updatedAt: now });
    }
    return {
      orderNumber: (order.get('number') as number) ?? 0,
      customerId: (order.get('customerId') as string) ?? '',
      dueMinor: Math.max(0, ((order.get('totalMinor') as number) ?? 0) - ((order.get('paidMinor') as number) ?? 0)),
    };
  });
}
