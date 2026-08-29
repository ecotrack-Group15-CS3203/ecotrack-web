'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { Button, Card, ErrorBanner } from '@/components/ui';

export default function LoginPage() {
  const { login, token, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && token) {
      router.replace('/');
    }
  }, [loading, token, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <Card className="w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-emerald-700 dark:text-emerald-400">
            EcoTrack
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Organisation &amp; platform administration
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <ErrorBanner message={error} />}

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
/* The login flow starts when the user enters their email and password and submits the form. 
handleSubmit() calls the login(email, password) function from useAuth, which sends the credentials 
to the backend and, if successful, stores the authentication token. After login completes, router.replace('/') 
redirects the user to the appropriate home page. The useEffect() also checks whether a user already has a valid 
token; if so, it automatically redirects them away from the login page. If authentication fails, the catch 
block captures the error and displays it using ErrorBanner. While the login request is processing, submitting 
becomes true, which disables the button and changes its text to “Signing in…”.*/