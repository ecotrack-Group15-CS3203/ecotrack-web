'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { useAuthedFetch } from '@/lib/use-org-api';
import type { CreateOrganisationResult } from '@/lib/types';
import { Button, Card, ErrorBanner, Spinner } from '@/components/ui';

export default function CreateOrganisationPage() {
  const { token, profile, loading, refreshProfile, setActiveOrgId } = useAuth();
  const api = useAuthedFetch();
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && token && profile?.isPlatformAdmin) router.replace('/platform');
  }, [loading, profile, router, token]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await api.post<CreateOrganisationResult>('/organisations', {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      await refreshProfile();
      setActiveOrgId(result.organisation.id);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the organization.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Spinner />;

  if (!token) {
    return (
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Card style={{ maxWidth: 520, width: '100%', padding: 32 }}>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>Register an Organization</h1>
          <p style={{ color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 24 }}>
            Sign in with your EcoTrack account first. Don&apos;t have one? Create a Citizen or Volunteer account and we&apos;ll bring you back here.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Button onClick={() => router.push('/register?next=/create-organisation')}>Create an account</Button>
            <Button variant="secondary" onClick={() => router.push('/login?next=/create-organisation')}>Sign in</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flex: 1, justifyContent: 'center', padding: '48px 24px' }}>
      <Card style={{ width: '100%', maxWidth: 640, padding: 32 }}>
        <h1 style={{ fontSize: 26, marginBottom: 8 }}>Register an Organization</h1>
        <p style={{ color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 24 }}>
          You will become the sole Organization Admin for this organization. Once it is created, you can invite other users and assign their roles from Settings.
        </p>
        <form onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
          {error && <ErrorBanner message={error} />}
          <div className="field"><label htmlFor="organisation-name">Organization name <span className="req">*</span></label><input id="organisation-name" required value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="field"><label htmlFor="organisation-description">Description</label><textarea id="organisation-description" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <Button type="submit" disabled={submitting || !name.trim()}>{submitting ? 'Creating organization…' : 'Create organization'}</Button>
        </form>
      </Card>
    </div>
  );
}