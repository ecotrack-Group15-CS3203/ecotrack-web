'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch, ApiError } from './api';
import type { Profile } from './types';

const ACTIVE_ORG_KEY = 'ecotrack_active_org';

interface AuthContextValue {
  profile: Profile | null;
  loading: boolean;
  activeOrgId: string | null;
  setActiveOrgId: (organisationId: string) => void;
  /** Redirects to Asgardeo's hosted sign-in via /api/auth/login. Asgardeo owns
   * the credential UI, so there's no email/password to pass. */
  login: () => void;
  /** Redirects to /api/auth/logout, which also completes RP-initiated logout
   * against Asgardeo -- a plain local clear would leave its SSO cookie alive
   * and silently re-authenticate the next sign-in. */
  logout: () => void;
  refreshProfile: () => Promise<void>;
  /** @deprecated No-op kept only so app/accept-invite/page.tsx (out of scope
   * for the Asgardeo migration, still calling deleted /auth/login and
   * /auth/register endpoints) keeps compiling. Reloads the profile instead of
   * storing the token argument, since there's no token to store any more. */
  completeAuth: (accessToken: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    const data = await apiFetch<Profile>('/auth/me');
    setProfile(data);

    const storedOrgId = localStorage.getItem(ACTIVE_ORG_KEY);
    const validStoredOrg = data.memberships.find((m) => m.organisationId === storedOrgId);
    if (validStoredOrg) {
      setActiveOrgIdState(storedOrgId);
    } else if (data.memberships.length > 0) {
      setActiveOrgIdState(data.memberships[0].organisationId);
    }
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

  const completeAuth = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature kept for callers, see the deprecation note above
    async (_accessToken: string) => {
      await loadProfile();
    },
    [loadProfile],
  );

  const login = useCallback(() => {
    window.location.href = '/api/auth/login';
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(ACTIVE_ORG_KEY);
    setProfile(null);
    setActiveOrgIdState(null);
    window.location.href = '/api/auth/logout';
  }, []);

  const setActiveOrgId = useCallback((organisationId: string) => {
    localStorage.setItem(ACTIVE_ORG_KEY, organisationId);
    setActiveOrgIdState(organisationId);
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadProfile();
  }, [loadProfile]);

  const value = useMemo(
    () => ({
      profile,
      loading,
      activeOrgId,
      setActiveOrgId,
      login,
      logout,
      refreshProfile,
      completeAuth,
    }),
    [profile, loading, activeOrgId, setActiveOrgId, login, logout, refreshProfile, completeAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { ApiError };
