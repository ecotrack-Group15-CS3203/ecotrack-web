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
