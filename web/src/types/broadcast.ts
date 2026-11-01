import type { Timestamp } from 'firebase/firestore';

/** A record of one broadcast send — written by the sendBroadcast Cloud Function, read-only here. */
export interface Broadcast {
  message: string;
  audienceSize: number;
  sentCount: number;
  failedCount: number;
  createdBy: string;
  createdAt: Timestamp;
}
