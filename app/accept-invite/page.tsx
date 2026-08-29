'use client';

import { FormEvent, ReactNode, Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api';
import { Button, Card, ErrorBanner, Spinner } from '@/components/ui';
import type { InvitationInfo } from '@/lib/types';

const inputClass =
  'w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 disabled:opacity-60';
const labelClass = 'mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300';

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<Shell><Spinner /></Shell>}>
      <AcceptInviteContent />
    </Suspense>
  );
}

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [info, setInfo] = useState<InvitationInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setTimeout(() => {
        setLoadError('This invite link is missing a token.');
        setLoading(false);
      }, 0);
      return;
    }
    apiFetch<InvitationInfo>(`/auth/invitations/${token}`)
      .then(setInfo)
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : 'Could not load this invitation.'),
      )
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <Shell>
        <Spinner />
      </Shell>
    );
  }

  if (loadError || !token || !info) {
    return (
      <Shell>
        <Message title="Invitation not found" body={loadError ?? 'This invite link is invalid.'}>
          <Button onClick={() => router.push('/login')} className="w-full">
            Go to login
          </Button>
        </Message>
      </Shell>
    );
  }

  if (info.accepted) {
    return (
      <Shell>
        <Message title="Already used" body="This invitation has already been accepted.">
          <Button onClick={() => router.push('/login')} className="w-full">
            Go to login
          </Button>
        </Message>
      </Shell>
    );
  }

  if (info.expired) {
    return (
      <Shell>
        <Message
          title="Invitation expired"
          body="This invite link has expired. Ask your platform administrator to resend it from the organisation's detail page."
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold text-emerald-700 dark:text-emerald-400">EcoTrack</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Join <strong>{info.organisationName}</strong> as organisation admin
        </p>
      </div>
      {info.emailAlreadyRegistered ? (
        <LoginToAcceptForm token={token} info={info} />
      ) : (
        <SetPasswordForm token={token} info={info} />
      )}
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <Card className="w-full max-w-sm p-8">{children}</Card>
    </div>
  );
}

function Message({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return (
    <div className="text-center">
      <h1 className="mb-2 text-xl font-semibold">{title}</h1>
      <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">{body}</p>
      {children}
    </div>
  );
}

function LoginToAcceptForm({ token, info }: { token: string; info: InvitationInfo }) {
  const { completeAuth } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const loginResult = await apiFetch<{ accessToken: string }>('/auth/login', {
        method: 'POST',
        body: { email: info.email, password },
      });
      await apiFetch(`/auth/invitations/${token}/accept`, {
        method: 'POST',
        token: loginResult.accessToken,
      });
      await completeAuth(loginResult.accessToken);
      router.replace('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        An account already exists for this email. Log in with its existing password to accept the
        invitation.
      </p>
      {error && <ErrorBanner message={error} />}
      <div>
        <label className={labelClass}>Email</label>
        <input type="email" value={info.email} disabled className={inputClass} />
      </div>
      <div>
        <label htmlFor="password" className={labelClass}>
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
          placeholder="••••••••"
        />
      </div>
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? 'Accepting…' : 'Log in and accept'}
      </Button>
    </form>
  );
}

function SetPasswordForm({ token, info }: { token: string; info: InvitationInfo }) {
  const { completeAuth } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState(info.invitedFullName ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await apiFetch<{ accessToken: string }>('/auth/register', {
        method: 'POST',
        body: { fullName, email: info.email, password, invitationToken: token },
      });
      await completeAuth(result.accessToken);
      router.replace('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <ErrorBanner message={error} />}
      <div>
        <label className={labelClass}>Email</label>
        <input type="email" value={info.email} disabled className={inputClass} />
      </div>
      <div>
        <label htmlFor="fullName" className={labelClass}>
          Full name
        </label>
        <input
          id="fullName"
          type="text"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="password" className={labelClass}>
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
          placeholder="At least 8 characters"
        />
      </div>
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? 'Setting up…' : 'Set password and continue'}
      </Button>
    </form>
  );
}

/* 
The SetPasswordForm component is used when a user accepts an invitation and needs to set their password. 
It receives the invitation token and invitation information as props. The form includes fields for the user's full name and password. 
When submitted, it sends a POST request to /auth/register with the full name, email, password, and invitation token. 
If the request succeeds, completeAuth() is called with the returned access token, and the user is redirected to the homepage. 
If an error occurs, it is displayed using an ErrorBanner. The submit button shows a loading state while the request is in progress.
*/