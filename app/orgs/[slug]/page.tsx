import type { Metadata } from 'next';
import Link from 'next/link';
import { IconLeaf } from '@/components/icons';
import { Card } from '@/components/ui';

// Hardcoded English, matching every other server component in this app
// (app/page.tsx, app/app/page.tsx, app/invite/[token]/page.tsx) — react-i18next
// is client-only, so there is no SSR-safe t() available here. See
// ARCHITECTURE.md's i18n section for the documented exemption.

const API_URL = (process.env.API_URL ?? 'http://localhost:4000/v1').replace(/\/$/, '');
const MOBILE_APP_URL = process.env.NEXT_PUBLIC_MOBILE_APP_URL;

interface PublicOrganisation {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  contactEmail: string;
  serviceAreaRadiusKm: number | null;
}

// Public, unauthenticated GET — fetched directly against the API rather than
// through /api/proxy, same reasoning as the invite page: this needs to render
// for a visitor with no session at all.
async function fetchOrganisation(slug: string): Promise<PublicOrganisation | null> {
  try {
    const response = await fetch(`${API_URL}/organisations/by-slug/${encodeURIComponent(slug)}`, {
      // Org name/description/service-area change rarely enough that a short
      // cache is worth it for a page whose whole point is being crawlable.
      next: { revalidate: 300 },
    });
    if (!response.ok) return null;
    return (await response.json()) as PublicOrganisation;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const org = await fetchOrganisation(slug);
  if (!org) return { title: 'Organisation not found' };
  return {
    title: `${org.name} — EcoTrack`,
    description: org.description ?? `${org.name} coordinates environmental cleanup efforts with EcoTrack.`,
  };
}

export default async function PublicOrganisationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const org = await fetchOrganisation(slug);

  return (
    <div>
      <header className="site-header">
        <Link href="/" className="site-brand">
          <IconLeaf style={{ width: 22, height: 22 }} />
          EcoTrack
        </Link>
        <Link href="/app" className="btn-text">
          Get the app
        </Link>
      </header>

      <main className="site-main" style={{ maxWidth: 640, paddingTop: 48, paddingBottom: 60 }}>
        {org ? (
          <>
            <Card style={{ padding: 28 }}>
              <h1 style={{ fontSize: 24, marginBottom: 8 }}>{org.name}</h1>
              {org.description && (
                <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 16 }}>
                  {org.description}
                </p>
              )}
              {org.serviceAreaRadiusKm && (
                <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
                  Serves reports within {org.serviceAreaRadiusKm} km of its base of operations.
                </p>
              )}
            </Card>

            <section className="site-section" style={{ marginTop: 24 }}>
              <h2 style={{ fontSize: 18, marginBottom: 10 }}>Join {org.name}</h2>
              <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 16 }}>
                Volunteering with {org.name} — reporting hazards, taking on cleanup tasks, and
                RSVPing to events — happens in the EcoTrack mobile app.
              </p>
              <div className="site-hero-ctas">
                {MOBILE_APP_URL ? (
                  <a href={MOBILE_APP_URL} className="btn btn-primary">
                    Download EcoTrack
                  </a>
                ) : (
                  <Link href="/app" className="btn btn-primary">
                    Get the app
                  </Link>
                )}
              </div>
            </section>
          </>
        ) : (
          <Card style={{ padding: 28 }}>
            <h1 style={{ fontSize: 20, marginBottom: 10 }}>Organisation not found</h1>
            <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 20 }}>
              This page may have moved, or the organisation may no longer be active.
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
