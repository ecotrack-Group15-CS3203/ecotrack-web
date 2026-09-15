import type { Metadata } from 'next';
import Link from 'next/link';
import {
  IconEvents,
  IconIncidents,
  IconLeaf,
  IconPin,
  IconPlus,
  IconTasks,
  IconVolunteers,
} from '@/components/icons';
import { Reveal } from '@/components/public/reveal';

export const metadata: Metadata = {
  title: 'Get the EcoTrack app',
  description: 'Report hazards, take on cleanup tasks, and RSVP to volunteer events from the EcoTrack mobile app.',
};

const MOBILE_APP_URL = process.env.NEXT_PUBLIC_MOBILE_APP_URL;

const FEATURES = [
  { icon: IconPin, title: 'Report a hazard', body: 'Report a hazard in seconds, with a photo and its exact location.' },
  { icon: IconVolunteers, title: 'Join an organisation', body: 'Join an organisation covering your area to take on cleanup tasks near you.' },
  { icon: IconTasks, title: 'Take on tasks', body: 'Pick up cleanup tasks your organisation assigns and mark them done.' },
  { icon: IconEvents, title: 'RSVP to events', body: 'RSVP to volunteer events and track your impact over time.' },
];

export default function GetAppPage() {
  return (
    <>
      <section className="kg-hero">
        <div className="kg-container kg-hero-grid">
          <div>
            <span className="kg-pill">
              <span className="kg-live-dot" aria-hidden="true" />
              EcoTrack mobile
            </span>
            <h1>
              <span>EcoTrack lives</span>
              <span className="kg-grad-text">on your phone.</span>
            </h1>
            <p className="kg-lead">
              Reporting a hazard, taking on a cleanup task and RSVPing to a volunteer event all
              happen in the mobile app. The web dashboard is for organisation admins only.
            </p>
            <div className="kg-actions">
              {MOBILE_APP_URL && (
                <a href={MOBILE_APP_URL} className="btn btn-primary kg-btn-lg">
                  Download EcoTrack
                </a>
              )}
              <Link href="/organisations/new" className="btn btn-secondary kg-btn-lg">
                Register your organisation instead
              </Link>
            </div>
            {!MOBILE_APP_URL && (
              <p className="kg-note">The app is in beta. Ask your organisation admin for a download link.</p>
            )}
          </div>

          {/* Illustrative app screen, not live data. */}
          <div className="kg-phone" aria-hidden="true">
            <div className="kg-phone-screen">
              <span className="kg-phone-notch" />
              <div className="kg-phone-top">
                <span className="kg-brand-mark">
                  <IconLeaf />
                </span>
                <strong className="kg-card-title" style={{ margin: 0, fontSize: 16 }}>
                  EcoTrack
                </strong>
              </div>
              <div className="kg-phone-body">
                <span className="kg-mono">Near you</span>
                <div className="kg-row">
                  <span className="kg-phone-thumb" />
                  <span className="kg-tag kg-tag--rose">High urgency</span>
                  <strong>Illegal dumping near canal</strong>
                  <small>0.4 km away · 12m ago</small>
                </div>
                <div className="kg-row">
                  <span className="kg-tag kg-tag--cyan">In progress</span>
                  <strong>Cleanup task assigned</strong>
                  <small>Lakeside Conservation Society</small>
                </div>
              </div>
              <span className="kg-phone-fab">
                <IconPlus />
              </span>
              <div className="kg-phone-tabs">
                <IconIncidents />
                <IconTasks />
                <IconEvents />
                <IconVolunteers />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="what-you-can-do" className="kg-section kg-section--divider">
        <div className="kg-container">
          <Reveal className="kg-section-head">
            <span className="kg-eyebrow-mono">What you can do</span>
            <h2>
              Everything for <span className="kg-grad-text">citizens &amp; volunteers</span>
            </h2>
          </Reveal>
          <div className="kg-grid-4">
            {FEATURES.map((feature, index) => (
              <Reveal key={feature.title} delay={index * 70}>
                <article className="kg-card">
                  <span className="kg-icon-badge">
                    <feature.icon />
                  </span>
                  <h3>{feature.title}</h3>
                  <p>{feature.body}</p>
                </article>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div className="kg-callout" style={{ marginTop: 32 }}>
              <span className="kg-icon-badge kg-icon-badge--violet">
                <IconVolunteers />
              </span>
              <div>
                <h3>Have an invite link?</h3>
                <p>
                  If an organisation sent you a link to join as a volunteer, open it directly. It
                  walks you through signing in and confirming your location.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="kg-section--tight">
        <div className="kg-container">
          <Reveal>
            {/* Without a download link, "get the app" is a promise the button can't keep. */}
            {MOBILE_APP_URL ? (
              <div className="kg-cta">
                <div>
                  <h2>Ready to report your first hazard?</h2>
                  <p>Get the app to start reporting, or register your organisation to start claiming reports.</p>
                </div>
                <div className="kg-actions kg-actions--flush">
                  <a href={MOBILE_APP_URL} className="btn btn-primary kg-btn-lg">
                    Download EcoTrack
                  </a>
                  <Link href="/organisations/new" className="btn btn-secondary kg-btn-lg">
                    Register your organisation
                  </Link>
                </div>
              </div>
            ) : (
              <div className="kg-cta">
                <div>
                  <h2>Run a cleanup organisation?</h2>
                  <p>Register it to start claiming hazard reports in your area and coordinating volunteers.</p>
                </div>
                <div className="kg-actions kg-actions--flush">
                  <Link href="/organisations/new" className="btn btn-primary kg-btn-lg">
                    Register your organisation
                  </Link>
                </div>
              </div>
            )}
          </Reveal>
        </div>
      </section>
    </>
  );
}
