'use client';

import useSWR from 'swr';
import { useAuth } from './auth-context';
import { apiFetch } from './api';

/**
 * Convenience wrapper around SWR + apiFetch. The session lives in an HttpOnly
 * cookie the proxy reads, so the SWR key is just `path`. `path` may be null
 * to skip fetching (e.g. while the active organisation hasn't been resolved
 * yet, or before the profile has loaded).
 */
export function useApiGet<T>(path: string | null) {
  const { profile } = useAuth();
  const swr = useSWR<T>(path && profile ? path : null, (p: string) => apiFetch<T>(p));
  return swr;
}

export function useAuthedFetch() {
  return {
    get: <T,>(path: string) => apiFetch<T>(path),
    post: <T,>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'POST', body }),
    patch: <T,>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PATCH', body }),
    del: <T,>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
    upload: <T,>(path: string, formData: FormData) =>
      apiFetch<T>(path, { method: 'POST', body: formData, isFormData: true }),
  };
}
