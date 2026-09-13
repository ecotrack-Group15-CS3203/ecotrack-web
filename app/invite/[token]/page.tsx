import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { IconLeaf } from '@/components/icons';
import { Card } from '@/components/ui';
import { ID_TOKEN_COOKIE, verifyIdToken } from '@/lib/asgardeo-session';
import { InviteAcceptClient } from './invite-accept-client';

export const metadata: Metadata = {
  title: 'Accept your invitation',
};

const API_URL = (process.env.API_URL ?? 'http://localhost:4000/v1').replace(/\/$/, '');

interface InviteInfo {
  organisationName: string;
  expired: boolean;
  revoked: boolean;
  exhausted: boolean;
}

// Fetched directly against the API, not through /api/proxy -- this GET is
// public (SRS 3.1.12) and needs to render for a visitor with no session at
// all, which the proxy has nothing to attach a bearer token from anyway.
async function fetchInviteInfo(token: string): Promise<InviteInfo | null> {
  try {
    const response = await fetch(`${API_URL}/invites/${encodeURIComponent(token)}`, { cache: 'no-store' });
    if (!response.ok) return null;
    return (await response.json()) as InviteInfo;
  } catch {
    return null;
  }
}

async function isAuthenticated(): Promise<boolean> {
  const jar = await cookies();
  const idToken = jar.get(ID_TOKEN_COOKIE)?.value;
  if (!idToken) return false;
  try {
    await verifyIdToken(idToken);
    return true;
  } catch {
    return false;
  }
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [info, authenticated] = await Promise.all([fetchInviteInfo(token), isAuthenticated()]);

  return (
    <div>
      <header className="site-header">
        <Link href="/" className="site-brand">
          <IconLeaf style={{ width: 22, height: 22 }} />
          EcoTrack
        </Link>
      </header>

      <main className="site-main" style={{ maxWidth: 480, paddingTop: 48, paddingBottom: 60 }}>
        {info ? (
          <InviteAcceptClient token={token} info={info} authenticated={authenticated} />
        ) : (
          <Card style={{ padding: 28 }}>
            <h1 style={{ fontSize: 20, marginBottom: 10 }}>Invite link not found</h1>
            <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 20 }}>
              This link may have been mistyped, or the invite may no longer exist.
            </p>
            <Link href="/" className="btn btn-secondary">
              Back to home
            </Link>
          </Card>
        )}
      </main>
    </div>
  );
}
