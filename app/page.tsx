import type { Metadata } from 'next';
import Link from 'next/link';
import { AccountMenu } from '@/components/account-menu';
import {
  IconEvents,
  IconLeaf,
  IconOrganisations,
  IconPin,
  IconTasks,
  IconVolunteers,
  IconWorkflow,
} from '@/components/icons';

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
        <Link href="/" className="site-brand">
          <IconLeaf style={{ width: 22, height: 22 }} />
          EcoTrack
        </Link>
        <nav className="site-nav" aria-label="Primary">
          <a href="#how-it-works">How it works</a>
          <a href="#for-you">Who it&apos;s for</a>
          <AccountMenu />
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero-bg" aria-hidden="true" />
          <div className="hero-inner">
            <div>
              <p className="hero-eyebrow">
                <IconLeaf style={{ width: 15, height: 15 }} />
                Community-powered cleanup
              </p>
              <h1>
                Turn hazard reports into <span className="hero-highlight">cleanup action</span>
              </h1>
              <p className="hero-lead">
                Citizens report hazards with a photo and a location. Organisations claim what
                falls in their service area and coordinate volunteers to clean it up — all in
                one shared pipeline.
              </p>
              <div className="hero-actions">
                <Link href="/organisations/new" className="btn btn-primary btn-lg">
                  Register your organisation
                </Link>
                <Link href="/app" className="btn btn-secondary btn-lg">
                  Get the mobile app
                </Link>
              </div>
              <ul className="hero-highlights">
                <li>
                  <IconPin /> Photo + GPS reporting
                </li>
                <li>
                  <IconOrganisations /> Shared incident pool
                </li>
                <li>
                  <IconVolunteers /> Volunteer coordination
                </li>
              </ul>
            </div>

            <div className="hero-visual" aria-hidden="true">
              <div className="hero-visual-card hero-visual-card--report">
                <div className="hero-visual-thumb">
                  <IconPin
                    style={{
                      color: '#fff',
                      width: 26,
                      height: 26,
                      position: 'absolute',
                      bottom: 10,
                      left: 12,
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.35))',
                    }}
                  />
                </div>
                <span className="chip chip-urgency-high">High urgency</span>
                <h4>Illegal dumping near canal</h4>
                <p className="hero-visual-meta">0.4 km away · reported 12m ago</p>
              </div>
              <div className="hero-visual-card hero-visual-card--status">
                <span className="chip chip-progress">In progress</span>
                <p>Bolgoda Lake Conservation Society claimed this report and assigned a cleanup crew.</p>
                <div className="hero-visual-avatars">
                  <span className="avatar">JD</span>
                  <span className="avatar">AS</span>
                  <span className="avatar">+3</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="how-it-works">
          <div className="section-inner">
            <div className="section-head">
              <span className="section-eyebrow">How it works</span>
              <h2>One pipeline, start to finish</h2>
              <p>
                One shared pipeline connects everyone reporting a hazard to everyone who can do
                something about it.
              </p>
            </div>
            <div className="steps">
              <div className="step-card">
                <span className="step-index">01</span>
                <div className="step-icon">
                  <IconPin />
                </div>
                <h3>Report</h3>
                <p>
                  A citizen spots a hazard — illegal dumping, water pollution, and more — and
                  reports it from the mobile app with a photo and its exact location.
                </p>
              </div>
              <div className="step-card">
                <span className="step-index">02</span>
                <div className="step-icon">
                  <IconOrganisations />
                </div>
                <h3>Pool</h3>
                <p>
                  The report enters the shared Incident Pool, visible to every organisation whose
                  registered service area covers that location.
                </p>
              </div>
              <div className="step-card">
                <span className="step-index">03</span>
                <div className="step-icon">
                  <IconTasks />
                </div>
                <h3>Cleanup</h3>
                <p>
                  An organisation claims it, moves it through its own workflow, and assigns tasks
                  or organises an event with its volunteers to resolve it.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-inner">
            <div className="section-head">
              <span className="section-eyebrow">Why EcoTrack</span>
              <h2>Built for real cleanup operations</h2>
              <p>Everything a hazard report needs to become a finished cleanup, without the busywork.</p>
            </div>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">
                  <IconPin />
                </div>
                <h3>Photo + GPS reporting</h3>
                <p>Every report carries a photo and an exact location, so nothing is ambiguous.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <IconOrganisations />
                </div>
                <h3>Shared incident pool</h3>
                <p>Unclaimed reports stay visible to every organisation covering that area.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <IconWorkflow />
                </div>
                <h3>Configurable workflows</h3>
                <p>Each organisation defines its own stages, from report to resolution.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <IconEvents />
                </div>
                <h3>Volunteer events &amp; tasks</h3>
                <p>Assign cleanup tasks or organise events, and track them to completion.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="for-you">
          <div className="section-inner">
            <div className="section-head">
              <span className="section-eyebrow">Who it&apos;s for</span>
              <h2>One platform, two ways to help</h2>
            </div>
            <div className="audience-grid">
              <div className="audience-card audience-card--org">
                <div className="audience-icon">
                  <IconOrganisations />
                </div>
                <h3>For organisations</h3>
                <p>
                  Run your cleanup operation from one dashboard, scoped to the area you actually
                  cover.
                </p>
                <ul className="check-list">
                  <li>
                    <span className="check-icon">✓</span>
                    Claim incidents reported inside your registered service area
                  </li>
                  <li>
                    <span className="check-icon">✓</span>
                    Configure your own workflow stages, from report to resolution
                  </li>
                  <li>
                    <span className="check-icon">✓</span>
                    Assign cleanup tasks and organise volunteer events
                  </li>
                  <li>
                    <span className="check-icon">✓</span>
                    Bring volunteers on board with a shareable invite link
                  </li>
                </ul>
                <Link href="/organisations/new" className="btn btn-primary">
                  Register your organisation
                </Link>
              </div>
              <div className="audience-card audience-card--volunteer">
                <div className="audience-icon">
                  <IconVolunteers />
                </div>
                <h3>For citizens &amp; volunteers</h3>
                <p>Reporting, tasks, and events all live in the EcoTrack mobile app.</p>
                <ul className="check-list">
                  <li>
                    <span className="check-icon">✓</span>
                    Report a hazard in seconds, with a photo and its location
                  </li>
                  <li>
                    <span className="check-icon">✓</span>
                    Join an organisation to take on cleanup tasks near you
                  </li>
                  <li>
                    <span className="check-icon">✓</span>
                    RSVP to volunteer events and track your impact over time
                  </li>
                </ul>
                <Link href="/app" className="btn btn-secondary">
                  Get the mobile app
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="cta-banner">
          <div className="cta-banner-inner">
            <h2>Ready to start cleaning up?</h2>
            <p>
              Register your organisation to start claiming reports, or get the mobile app to
              report your first hazard.
            </p>
            <div className="cta-actions">
              <Link href="/organisations/new" className="btn btn-primary btn-lg">
                Register your organisation
              </Link>
              <Link href="/app" className="btn btn-secondary btn-lg">
                Get the mobile app
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div>
            <div className="lp-footer-brand">
              <IconLeaf style={{ width: 20, height: 20 }} />
              EcoTrack
            </div>
            <p className="lp-footer-tagline">
              Community-powered environmental cleanup — from hazard report to resolved cleanup.
            </p>
          </div>
          <div className="lp-footer-links">
            <div className="lp-footer-col">
              <h4>Platform</h4>
              <a href="#how-it-works">How it works</a>
              <a href="#for-you">Who it&apos;s for</a>
              <Link href="/login">Sign in</Link>
            </div>
            <div className="lp-footer-col">
              <h4>Get started</h4>
              <Link href="/organisations/new">Register your organisation</Link>
              <Link href="/app">Get the mobile app</Link>
            </div>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <span>© {new Date().getFullYear()} EcoTrack</span>
          <span>Maps by Mapbox / OpenStreetMap contributors</span>
        </div>
      </footer>
    </div>
  );
}
