'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button, Card, ErrorBanner, Spinner } from '@/components/ui';

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
    <div className="flex flex-1 items-center justify-center px-4">
      <Card className="w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-emerald-700 dark:text-emerald-400">
            EcoTrack
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Organisation administration
          </p>
        </div>

        <div className="space-y-4">
          {error && <ErrorBanner message={error} />}

          <Button onClick={login} className="w-full">
            Sign in with Asgardeo
          </Button>
        </div>
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
