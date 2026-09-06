'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api';
import { Button, Card, ErrorBanner } from '@/components/ui';

export default function RegisterPage() {
  const { completeAuth, token, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/';
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && token) router.replace(nextPath);
  }, [loading, nextPath, router, token]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await apiFetch<{ accessToken: string }>('/auth/register', {
        method: 'POST',
        body: { fullName, email, password },
      });
      await completeAuth(result.accessToken);
      router.replace(nextPath);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not reach the EcoTrack API. Start the backend and database, then try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Card style={{ width: '100%', maxWidth: 460, padding: 32 }}>
        <h1 style={{ fontSize: 24, marginBottom: 6 }}>Create your EcoTrack account</h1>
        <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 24 }}>
          Use your normal account to become an organization administrator after you create an organization.
        </p>
        <form onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
          {error && <ErrorBanner message={error} />}
          <div className="field"><label htmlFor="fullName">Full name</label><input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
          <div className="field"><label htmlFor="email">Email</label><input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="field"><label htmlFor="password">Password</label><input id="password" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" /></div>
          <Button type="submit" disabled={submitting}>{submitting ? 'Creating account…' : 'Create account'}</Button>
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-2)' }}>
            Already registered? <a href={`/login?next=${encodeURIComponent(nextPath)}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign in</a>
          </p>
        </form>
      </Card>
    </div>
  );
}