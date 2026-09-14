import type { Metadata } from 'next';
import Link from 'next/link';
import { AccountMenu } from '@/components/account-menu';
import {
  IconEvents,
  IconIncidents,
  IconLeaf,
  IconPin,
  IconPlus,
  IconTasks,
  IconVolunteers,
} from '@/components/icons';

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
        <nav className="site-nav" aria-label="Primary">
          <a href="#what-you-can-do">What you can do</a>
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
                EcoTrack Mobile
              </p>
              <h1>
                EcoTrack lives on <span className="hero-highlight">your phone</span>
              </h1>
              <p className="hero-lead">
                Reporting a hazard, taking on a cleanup task, and RSVPing to a volunteer event
                all happen in the mobile app — the web dashboard is for organisation admins
                only.
              </p>
              <div className="hero-actions">
                {MOBILE_APP_URL ? (
                  <a href={MOBILE_APP_URL} className="btn btn-primary btn-lg">
                    Download EcoTrack
                  </a>
                ) : (
                  <span className="hero-note">The app is in beta — ask your organisation admin for a download link</span>
                )}
                <Link href="/organisations/new" className="btn btn-secondary btn-lg">
                  Register your organisation instead
                </Link>
              </div>
              <ul className="hero-highlights">
                <li>
                  <IconPin /> Report in seconds
                </li>
                <li>
                  <IconTasks /> Take on cleanup tasks
                </li>
                <li>
                  <IconEvents /> RSVP to events
                </li>
              </ul>
            </div>

            <div className="phone-frame" aria-hidden="true">
              <div className="phone-screen">
                <div className="phone-notch" />
                <div className="phone-topbar">
                  <IconLeaf />
                  EcoTrack
                </div>
                <div className="phone-body">
                  <div className="phone-card">
                    <div className="phone-card-thumb" />
                    <span className="chip chip-urgency-high" style={{ fontSize: 10, padding: '2px 8px' }}>
                      High urgency
                    </span>
                    <h5>Illegal dumping near canal</h5>
                    <p>0.4 km away · 12m ago</p>
                  </div>
                  <div className="phone-card">
                    <span className="chip chip-progress" style={{ fontSize: 10, padding: '2px 8px' }}>
                      In progress
                    </span>
                    <h5>Cleanup task assigned</h5>
                    <p>Bolgoda Lake Conservation Society</p>
                  </div>
                </div>
                <div className="phone-fab">
                  <IconPlus />
                </div>
                <div className="phone-tabbar">
                  <IconIncidents className="icon--active" />
                  <IconTasks />
                  <IconEvents />
                  <IconVolunteers />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="what-you-can-do">
          <div className="section-inner">
            <div className="section-head">
              <span className="section-eyebrow">What you can do</span>
              <h2>Everything for citizens &amp; volunteers</h2>
              <p>Reporting, tasks, and events all live in the EcoTrack mobile app.</p>
            </div>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">
                  <IconPin />
                </div>
                <h3>Report a hazard</h3>
                <p>Report a hazard in seconds, with a photo and its exact location.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <IconVolunteers />
                </div>
                <h3>Join an organisation</h3>
                <p>Join an organisation covering your area to take on cleanup tasks near you.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <IconTasks />
                </div>
                <h3>Take on tasks</h3>
                <p>Pick up cleanup tasks assigned by your organisation and mark them done.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <IconEvents />
                </div>
                <h3>RSVP to events</h3>
                <p>RSVP to volunteer events and track your impact over time.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-inner">
            <div className="callout">
              <div className="callout-icon">
                <IconVolunteers />
              </div>
              <div>
                <h3>Have an invite link?</h3>
                <p>
                  If an organisation sent you a link to join as a volunteer, open it directly —
                  it will walk you through signing in and confirming your location.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="cta-banner">
          <div className="cta-banner-inner">
            <h2>Ready to report your first hazard?</h2>
            <p>Get the app to start reporting, or register your organisation to start claiming reports.</p>
            <div className="cta-actions">
              {MOBILE_APP_URL ? (
                <a href={MOBILE_APP_URL} className="btn btn-primary btn-lg">
                  Download EcoTrack
                </a>
              ) : (
                <Link href="/" className="btn btn-primary btn-lg">
                  Back to home
                </Link>
              )}
              <Link href="/organisations/new" className="btn btn-secondary btn-lg">
                Register your organisation
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
              <a href="#what-you-can-do">What you can do</a>
              <Link href="/organisations/new">Register your organisation</Link>
            </div>
            <div className="lp-footer-col">
              <h4>More</h4>
              <Link href="/">Back to home</Link>
            </div>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <span>© {new Date().getFullYear()} EcoTrack</span>
        </div>
      </footer>
    </div>
  );
}
