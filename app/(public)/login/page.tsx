'use client';

import Link from 'next/link';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button, Card, ErrorBanner, Spinner } from '@/components/ui';
import { BrandMark } from '@/components/public/public-header';

const ERROR_MESSAGES: Record<string, string> = {
  state_mismatch: 'Sign-in could not be verified. Please try again.',
  exchange_failed: 'Sign-in with Asgardeo failed. Please try again.',
};

function LoginContent() {
  const { login, profile, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorCode = searchParams.get('error');
  const error = errorCode ? (ERROR_MESSAGES[errorCode] ?? 'Something went wrong. Please try again.') : null;

  useEffect(() => {
    if (!loading && profile) {
      router.replace('/dashboard');
    }
  }, [loading, profile, router]);

  return (
    <div className="kg-auth">
      <Card className="kg-auth-card">
        <BrandMark size={64} className="kg-auth-mark" />
        <h1>Welcome back</h1>
        <p>Sign in to EcoTrack to manage your organisation.</p>

        {error && (
          <div style={{ marginBottom: 16, textAlign: 'left' }}>
            <ErrorBanner message={error} />
          </div>
        )}

        <Button onClick={login} className="kg-btn-lg">
          Sign in with Asgardeo
        </Button>

        <p className="kg-auth-note">
          Reporting a hazard or volunteering? <Link href="/app">Get the mobile app</Link>
        </p>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <LoginContent />
    </Suspense>
  );
}
