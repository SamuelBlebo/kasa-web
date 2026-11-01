import type { Timestamps } from './common';

export type OrgRole = 'owner' | 'admin' | 'staff';

/** Stored at /users/{uid}. orgId is the tenant this account belongs to. */
export interface UserProfile extends Timestamps {
  uid: string;
  email: string;
  fullName: string;
  photoURL: string | null;
  orgId: string | null;
  role: OrgRole;
}
