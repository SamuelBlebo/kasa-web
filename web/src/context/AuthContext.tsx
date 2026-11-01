import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { onSnapshot } from 'firebase/firestore';
import { auth, orgRef, platformAdminRef, userRef } from '@/firebase';
import type { Organization, UserProfile, WithId } from '@/types';

interface AuthContextValue {
  /** Raw Firebase user. Null when signed out. */
  user: User | null;
  /** The /users/{uid} document — carries orgId and role. */
  profile: UserProfile | null;
  /** The tenant this session is scoped to. Every query uses org.id. */
  org: WithId<Organization> | null;
  /** OrderFlow staff, not a merchant — see firestore.rules' isPlatformAdmin(). */
  isPlatformAdmin: boolean;
  /** True until auth, profile, and platform-admin status have all resolved. */
  initialising: boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [org, setOrg] = useState<WithId<Organization> | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [profileResolved, setProfileResolved] = useState(false);
  const [adminResolved, setAdminResolved] = useState(false);

  // 1. Track the signed-in Firebase user.
  useEffect(
    () =>
      onAuthStateChanged(auth, (next) => {
        setUser(next);
        if (!next) {
          setProfile(null);
          setOrg(null);
          setIsPlatformAdmin(false);
          setProfileResolved(true);
          setAdminResolved(true);
        } else {
          setProfileResolved(false);
          setAdminResolved(false);
        }
      }),
    [],
  );

  // 2. Follow that user's profile document.
  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      userRef(user.uid),
      (snap) => {
        setProfile(snap.exists() ? snap.data() : null);
        setProfileResolved(true);
      },
      () => setProfileResolved(true),
    );
  }, [user]);

  // 3. Follow the tenant named by the profile.
  useEffect(() => {
    const orgId = profile?.orgId;
    if (!orgId) {
      setOrg(null);
      return;
    }
    return onSnapshot(orgRef(orgId), (snap) => {
      setOrg(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });
  }, [profile?.orgId]);

  // 4. Independently check platform-admin status — orthogonal to org membership.
  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      platformAdminRef(user.uid),
      (snap) => {
        setIsPlatformAdmin(snap.exists());
        setAdminResolved(true);
      },
      () => setAdminResolved(true),
    );
  }, [user]);

  const initialising = !profileResolved || !adminResolved;

  const value = useMemo(
    () => ({ user, profile, org, isPlatformAdmin, initialising }),
    [user, profile, org, isPlatformAdmin, initialising],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
