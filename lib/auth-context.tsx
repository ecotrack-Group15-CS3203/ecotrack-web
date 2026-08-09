'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch, ApiError } from './api';
import type { Profile } from './types';

const TOKEN_KEY = 'ecotrack_token';
const ACTIVE_ORG_KEY = 'ecotrack_active_org';

interface AuthContextValue {
  token: string | null;
  profile: Profile | null;
  loading: boolean;
  activeOrgId: string | null;
  setActiveOrgId: (organisationId: string) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  /** Store an already-issued access token (e.g. from register/accept-invite) and load its profile. */
  completeAuth: (accessToken: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (activeToken: string) => {
    const data = await apiFetch<Profile>('/auth/me', { token: activeToken });
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
    // One-time client-only bootstrap from localStorage (unavailable during SSR),
    // not a subscription — the flagged setState-in-effect pattern doesn't apply.
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    setToken(stored);
    loadProfile(stored)
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, [loadProfile]);

  const completeAuth = useCallback(
    async (accessToken: string) => {
      localStorage.setItem(TOKEN_KEY, accessToken);
      setToken(accessToken);
      await loadProfile(accessToken);
    },
    [loadProfile],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await apiFetch<{ accessToken: string }>('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      await completeAuth(result.accessToken);
    },
    [completeAuth],
  );

  const logout = useCallback(() => {
    if (token) {
      apiFetch('/auth/logout', { method: 'POST', token }).catch(() => undefined);
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ACTIVE_ORG_KEY);
    setToken(null);
    setProfile(null);
    setActiveOrgIdState(null);
  }, [token]);

  const setActiveOrgId = useCallback((organisationId: string) => {
    localStorage.setItem(ACTIVE_ORG_KEY, organisationId);
    setActiveOrgIdState(organisationId);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (token) await loadProfile(token);
  }, [token, loadProfile]);

  const value = useMemo(
    () => ({
      token,
      profile,
      loading,
      activeOrgId,
      setActiveOrgId,
      login,
      logout,
      refreshProfile,
      completeAuth,
    }),
    [token, profile, loading, activeOrgId, setActiveOrgId, login, logout, refreshProfile, completeAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { ApiError };
