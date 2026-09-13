import type { Metadata } from 'next';
import Link from 'next/link';
import { IconLeaf } from '@/components/icons';

export const metadata: Metadata = {
  title: 'EcoTrack — Community-powered environmental cleanup',
  description:
    'Citizens report environmental hazards, organisations claim and coordinate the cleanup. Register your organisation or get the EcoTrack mobile app.',
  openGraph: {
    title: 'EcoTrack — Community-powered environmental cleanup',
    description:
      'Citizens report environmental hazards, organisations claim and coordinate the cleanup.',
    type: 'website',
  },
};

export default function LandingPage() {
  return (
    <div>
      <header className="site-header">
        <div className="site-brand">
          <IconLeaf style={{ width: 22, height: 22 }} />
          EcoTrack
        </div>
        <Link href="/login" className="btn-text">
          Sign in
        </Link>
      </header>

      <main className="site-main">
        <section className="site-hero">
          <h1>Community-powered environmental cleanup</h1>
          <p>
            Citizens report hazards with a photo and a location. Organisations claim what falls in
            their service area and coordinate volunteers to clean it up.
          </p>
          <div className="site-hero-ctas">
            <Link href="/organisations/new" className="btn btn-primary">
              Register your organisation
            </Link>
            <Link href="/app" className="btn btn-secondary">
              Get the mobile app
            </Link>
          </div>
        </section>

        <section className="site-section">
          <h2>How it works</h2>
          <p className="lead">
            One shared pipeline connects everyone reporting a hazard to everyone who can do
            something about it.
          </p>
          <div className="site-steps">
            <div className="site-step">
              <div className="step-num">1</div>
              <h3>Report</h3>
              <p>
                A citizen spots a hazard — illegal dumping, water pollution, and more — and reports
                it from the mobile app with a photo and its exact location.
              </p>
            </div>
            <div className="site-step">
              <div className="step-num">2</div>
              <h3>Pool</h3>
              <p>
                The report enters the shared Incident Pool, visible to every organisation whose
                registered service area covers that location.
              </p>
            </div>
            <div className="site-step">
              <div className="step-num">3</div>
              <h3>Cleanup</h3>
              <p>
                An organisation claims it, moves it through its own workflow, and assigns tasks or
                organises an event with its volunteers to resolve it.
              </p>
            </div>
          </div>
        </section>

        <section className="site-section">
          <div className="site-two-col">
            <div>
              <h2>For organisations</h2>
              <p style={{ fontSize: 14, color: 'var(--text-2)' }}>
                Run your cleanup operation from one dashboard, scoped to the area you actually
                cover.
              </p>
              <ul>
                <li>Claim incidents reported inside your registered service area</li>
                <li>Configure your own workflow stages, from report to resolution</li>
                <li>Assign cleanup tasks and organise volunteer events</li>
                <li>Bring volunteers on board with a shareable invite link</li>
              </ul>
              <Link href="/organisations/new" className="btn btn-primary">
                Register your organisation
              </Link>
            </div>
            <div>
              <h2>For citizens &amp; volunteers</h2>
              <p style={{ fontSize: 14, color: 'var(--text-2)' }}>
                Reporting, tasks, and events all live in the EcoTrack mobile app.
              </p>
              <ul>
                <li>Report a hazard in seconds, with a photo and its location</li>
                <li>Join an organisation to take on cleanup tasks near you</li>
                <li>RSVP to volunteer events and track your impact over time</li>
              </ul>
              <Link href="/app" className="btn btn-secondary">
                Get the mobile app
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <p>
          EcoTrack is built for community-driven environmental cleanup. Maps by Mapbox / OpenStreetMap
          contributors. <Link href="/login">Sign in</Link>
        </p>
      </footer>
    </div>
  );
}
