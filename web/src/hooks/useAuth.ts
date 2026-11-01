import { useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/**
 * The current tenant id, for screens that are already behind ProtectedRoute
 * and can assume an organization exists.
 */
export function useOrgId(): string {
  const { org } = useAuth();
  if (!org) throw new Error('useOrgId used outside an organization-scoped route');
  return org.id;
}
