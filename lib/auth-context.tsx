'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch, ApiError } from './api';
import type { Profile } from './types';

interface AuthContextValue {
  profile: Profile | null;
  loading: boolean;
  /** Derived from profile.organisation, not stored state -- a user has at most
   * one organisation (SRS 3.1.1), so there is nothing to switch between and
   * nothing to persist across sessions. null for a citizen with no org. */
  activeOrgId: string | null;
  /** Redirects to Asgardeo's hosted sign-in via /api/auth/login. Asgardeo owns
   * the credential UI, so there's no email/password to pass. */
  login: () => void;
  /** Redirects to /api/auth/logout, which also completes RP-initiated logout
   * against Asgardeo -- a plain local clear would leave its SSO cookie alive
   * and silently re-authenticate the next sign-in. */
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    const data = await apiFetch<Profile>('/auth/me');
    setProfile(data);
  }, []);

  useEffect(() => {
    // The session lives in an HttpOnly cookie the proxy reads -- there's
    // nothing to inspect client-side, so just ask /auth/me and treat a 401
    // as "not signed in".
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProfile()
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [loadProfile]);

  const login = useCallback(() => {
    window.location.href = '/api/auth/login';
  }, []);

  const logout = useCallback(() => {
    setProfile(null);
    window.location.href = '/api/auth/logout';
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadProfile();
  }, [loadProfile]);

  const activeOrgId = profile?.organisation?.id ?? null;

  const value = useMemo(
    () => ({
      profile,
      loading,
      activeOrgId,
      login,
      logout,
      refreshProfile,
    }),
    [profile, loading, activeOrgId, login, logout, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { ApiError };
