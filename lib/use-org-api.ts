'use client';

import useSWR from 'swr';
import { useAuth } from './auth-context';
import { apiFetch } from './api';

/**
 * Convenience wrapper around SWR + apiFetch, scoped to the caller's
 * bearer token. `path` may be null to skip fetching (e.g. while the
 * active organisation hasn't been resolved yet).
 */
export function useApiGet<T>(path: string | null) {
  const { token } = useAuth();
  const swr = useSWR<T>(
    path && token ? [path, token] : null,
    ([p, t]: [string, string]) => apiFetch<T>(p, { token: t }),
  );
  return swr;
}

export function useAuthedFetch() {
  const { token } = useAuth();
  return {
    get: <T,>(path: string) => apiFetch<T>(path, { token }),
    post: <T,>(path: string, body?: unknown) =>
      apiFetch<T>(path, { method: 'POST', token, body }),
    patch: <T,>(path: string, body?: unknown) =>
      apiFetch<T>(path, { method: 'PATCH', token, body }),
    del: <T,>(path: string) => apiFetch<T>(path, { method: 'DELETE', token }),
    upload: <T,>(path: string, formData: FormData) =>
      apiFetch<T>(path, { method: 'POST', token, body: formData, isFormData: true }),
  };
}

/* The use-org-api.ts file provides custom hooks and utility functions for interacting with the EcoTrack backend API. 
The useApiGet() hook wraps SWR and apiFetch to perform GET requests with the caller's bearer token, automatically handling token inclusion and conditional fetching. 
The useAuthedFetch() function returns an object with methods for making authenticated API requests (GET, POST, PATCH, DELETE, and file uploads) using the caller's bearer token. */