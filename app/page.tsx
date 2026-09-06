'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button, Card, Spinner } from '@/components/ui';

// Home() - Root page that routes users based on auth status: login page if not authenticated, or dashboard/platform based on role
export default function Home() {
  const { token, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!token) return;
    if (profile?.isPlatformAdmin) {
      router.replace('/platform');
    } else {
      router.replace('/dashboard');
    }
  }, [loading, token, profile, router]);

  if (loading || token) return <Spinner />;

  return (
    <main style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Card style={{ maxWidth: 560, width: '100%', padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--primary)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 12 }}>
          EcoTrack
        </p>
        <h1 style={{ fontSize: 32, margin: '12px 0 10px' }}>Coordinate action for a cleaner future.</h1>
        <p style={{ color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 28 }}>
          Join your community or create an organisation that can turn environmental reports into coordinated work.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Button onClick={() => router.push('/create-organisation')}>Register an Organization</Button>
          <Button variant="secondary" onClick={() => router.push('/login')}>Sign in</Button>
        </div>
        <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 20 }}>
          New to EcoTrack? You can create a Citizen or Volunteer account during organization registration.
        </p>
      </Card>
    </main>
  );
}
