import type { Metadata } from 'next';
import Link from 'next/link';
import { IconLeaf } from '@/components/icons';

export const metadata: Metadata = {
  title: 'Get the EcoTrack app',
  description: 'Report hazards, take on cleanup tasks, and RSVP to volunteer events from the EcoTrack mobile app.',
};

const MOBILE_APP_URL = process.env.NEXT_PUBLIC_MOBILE_APP_URL;

export default function GetAppPage() {
  return (
    <div>
      <header className="site-header">
        <Link href="/" className="site-brand">
          <IconLeaf style={{ width: 22, height: 22 }} />
          EcoTrack
        </Link>
        <Link href="/login" className="btn-text">
          Sign in
        </Link>
      </header>

      <main className="site-main">
        <section className="site-hero">
          <h1>EcoTrack lives on your phone</h1>
          <p>
            Reporting a hazard, taking on a cleanup task, and RSVPing to a volunteer event all
            happen in the mobile app — the web dashboard is for organisation admins only.
          </p>
          <div className="site-hero-ctas">
            {MOBILE_APP_URL ? (
              <a href={MOBILE_APP_URL} className="btn btn-primary">
                Download EcoTrack
              </a>
            ) : (
              <div
                style={{
                  padding: '11px 18px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--pending-tint)',
                  color: 'var(--pending)',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                The app is in beta — ask your organisation admin for a download link.
              </div>
            )}
            <Link href="/organisations/new" className="btn btn-secondary">
              Register your organisation instead
            </Link>
          </div>
        </section>

        <section className="site-section">
          <div className="site-two-col">
            <div>
              <h2>What you can do</h2>
              <ul>
                <li>Report a hazard in seconds, with a photo and its exact location</li>
                <li>Join an organisation covering your area to take on cleanup tasks</li>
                <li>RSVP to volunteer events and track your impact over time</li>
              </ul>
            </div>
            <div>
              <h2>Have an invite link?</h2>
              <p style={{ fontSize: 14, color: 'var(--text-2)' }}>
                If an organisation sent you a link to join as a volunteer, open it directly — it
                will walk you through signing in and confirming your location.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <p>
          <Link href="/">Back to home</Link>
        </p>
      </footer>
    </div>
  );
}
