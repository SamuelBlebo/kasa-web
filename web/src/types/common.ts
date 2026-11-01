import type { Timestamp } from 'firebase/firestore';

export type ISODate = string;

export interface Timestamps {
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** A document as read from Firestore: stored fields plus its id. */
export type WithId<T> = T & { id: string };

export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; data: T };
