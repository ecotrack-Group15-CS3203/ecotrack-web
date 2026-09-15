'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

/**
 * The header's primary button. An org admin already has an organisation, so offering
 * them "Register org" would be a dead end. Reserves its space while the session
 * loads, so the header doesn't jump when the label settles.
 */
export function HeaderCta() {
  const { profile, loading } = useAuth();

  if (loading) return <span className="kg-cta-placeholder" aria-hidden="true" />;

  if (profile?.role === 'org_admin' && profile.organisation) {
    return (
      <Link href="/dashboard" className="btn btn-primary btn-sm">
        Dashboard
      </Link>
    );
  }

  return (
    <Link href="/organisations/new" className="btn btn-primary btn-sm">
      Register org
    </Link>
  );
}
