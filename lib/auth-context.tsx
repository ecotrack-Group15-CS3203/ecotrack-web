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

// AuthProvider component - Wraps the app and manages all authentication state (login, logout, user profile)
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // loadProfile() - Fetches user profile and memberships from backend using a token
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
    // Restore the backend session from the browser token after hydration.
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

  // completeAuth() - Saves a token to localStorage and loads the user profile
  const completeAuth = useCallback(
    async (accessToken: string) => {
      localStorage.setItem(TOKEN_KEY, accessToken);
      setToken(accessToken);
      await loadProfile(accessToken);
    },
    [loadProfile],
  );

  // login() - Sends email and password to backend, receives token, and loads profile
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

  // logout() - Clears token and user profile, notifies backend, clears localStorage
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

  // setActiveOrgId() - Saves the currently selected organization ID to localStorage
  const setActiveOrgId = useCallback((organisationId: string) => {
    localStorage.setItem(ACTIVE_ORG_KEY, organisationId);
    setActiveOrgIdState(organisationId);
  }, []);

  // refreshProfile() - Re-fetches the current user's profile from the backend
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

// useAuth() - Hook that returns current auth state (token, profile, login, logout, etc.) for any component
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { ApiError };
/* This code manages the authentication and user session for the whole EcoTrack frontend. 
When the app starts, it checks localStorage for a saved login token; 
if a token exists, it calls /auth/me to get the user’s profile and organisation memberships. 
When a user logs in, login() sends the email and password to /auth/login, receives an access token, 
saves it, and loads the user profile. 
setActiveOrgId() stores the organisation the user is currently working with, while refreshProfile() gets 
updated user information. 
When the user logs out, logout() removes the token, active organisation, and profile information. 
The useAuth() hook allows other pages and components to easily access this authentication information.*/