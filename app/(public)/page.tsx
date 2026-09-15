import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { IconOrganisations, IconVolunteers } from '@/components/icons';
import { CountUp } from '@/components/public/count-up';
import { KineticStack } from '@/components/public/kinetic-stack';
import { Reveal } from '@/components/public/reveal';
import { toStatItems, type PublicStats } from '@/lib/public-stats';

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

const API_URL = (process.env.API_URL ?? 'http://localhost:4000/v1').replace(/\/$/, '');

/**
 * Fetched once per page load (no-store): a reload is the refresh, with no polling.
 * Anything short of a clean response just hides the stats row, and the short
 * timeout keeps a slow API from holding up the whole landing page.
 */
async function fetchPublicStats(): Promise<PublicStats | null> {
  try {
    const response = await fetch(`${API_URL}/public/stats`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) return null;
    return (await response.json()) as PublicStats;
  } catch {
    return null;
  }
}

const STEPS = [
  {
    title: 'Citizens report',
    body: 'Someone spots a hazard and reports it from the mobile app with a photo, a description and a severity, pinned to its exact location.',
    tags: ['photo', 'severity', 'gps'],
  },
  {
    title: 'Organisations claim',
    body: 'The report lands in a shared pool visible to every organisation covering that area. One claims it and moves it through its own workflow.',
    tags: ['shared pool', 'claim', 'workflow'],
  },
  {
    title: 'Volunteers clear it',
    body: 'The organisation assigns cleanup tasks or runs an event, volunteers RSVP and turn up, and the incident moves to resolved.',
    tags: ['tasks', 'events', 'rsvp'],
  },
];

const ORGANISATION_POINTS = [
  'Claim incidents reported inside your registered service area',
  'Configure your own workflow stages, from report to resolution',
  'Assign cleanup tasks and organise volunteer events',
  'Bring volunteers on board with a shareable invite link',
];

const CITIZEN_POINTS = [
  'Report a hazard in seconds, with a photo and its location',
  'Join an organisation to take on cleanup tasks near you',
  'RSVP to volunteer events and track your impact over time',
];

const float = (vars: Record<string, string | number>) => vars as CSSProperties;

export default async function LandingPage() {
  const stats = toStatItems(await fetchPublicStats());

  return (
    <>
      <section className="kg-hero">
        <div className="kg-container kg-hero-grid">
          <div>
            <span className="kg-pill">
              <span className="kg-live-dot" aria-hidden="true" />
              Community-powered cleanup
            </span>
            <h1>
              <span>Every hazard,</span>
              <span className="kg-grad-text">claimed &amp; cleared.</span>
            </h1>
            <p className="kg-lead">
              EcoTrack connects the people who spot environmental hazards with the organisations
              that clean them up. Citizens report with a photo and a location; your team claims what
              falls in its area, assigns volunteers and runs cleanup events, all in one shared
              pipeline.
            </p>
            <div className="kg-actions">
              <Link href="/organisations/new" className="btn btn-primary kg-btn-lg">
                Register your organisation
              </Link>
              <Link href="/app" className="btn btn-secondary kg-btn-lg">
                Get the citizen app <span className="kg-arrow" aria-hidden="true">→</span>
              </Link>
            </div>
            {stats.length > 0 && (
              <dl className="kg-stats">
                {stats.map((stat) => (
                  <div key={stat.key} className="kg-stat">
                    <dt className="kg-stat-label">{stat.label}</dt>
                    <dd className="kg-stat-value">
                      <CountUp value={stat.value} decimals={stat.decimals} suffix={stat.suffix} />
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          {/* Illustrative sample content, not live data: hidden from assistive tech. */}
          <KineticStack>
            <span className="kg-orbit" />
            <div className="kg-float" style={float({ top: 0, right: 0, width: 430, '--depth': 0.6 })}>
              <div className="kg-float-card" style={float({ '--tilt': '5deg', '--bob': '9s' })}>
                <div className="kg-card-head">
                  <span className="kg-mono">Live board</span>
                  <span className="kg-tag">3 active</span>
                </div>
                <div className="kg-row">
                  <div>
                    <strong>River bank litter</strong>
                    <small>Riverside greenway · 400 m</small>
                  </div>
                  <span className="kg-tag kg-tag--rose">Critical</span>
                </div>
                <div className="kg-row">
                  <div>
                    <strong>Plastic pile-up</strong>
                    <small>Canal road · 1.2 km</small>
                  </div>
                  <span className="kg-tag kg-tag--amber">High</span>
                </div>
              </div>
            </div>
            <div className="kg-float" style={float({ top: 176, left: 0, width: 410, zIndex: 2, '--depth': 1.2 })}>
              <div className="kg-float-card" style={float({ '--tilt': '-4deg', '--bob': '8s', '--bob-delay': '-2s' })}>
                <span className="kg-mono">
                  <span className="kg-live-dot" /> Claimed · 2m ago
                </span>
                <strong className="kg-card-title">Lakeside Conservation Society</strong>
                <small>assigned to 4 volunteers</small>
                <div className="kg-avatars">
                  <span />
                  <span />
                  <span />
                  <span>+2</span>
                </div>
                <div className="kg-fake-actions">
                  <span className="kg-fake-btn kg-fake-btn--primary">Dispatch</span>
                  <span className="kg-fake-btn">Create event</span>
                </div>
              </div>
            </div>
            <div className="kg-float" style={float({ top: 420, right: 12, width: 300, '--depth': 0.9 })}>
              <div className="kg-float-card" style={float({ '--tilt': '3deg', '--bob': '10s', '--bob-delay': '-5s' })}>
                <div className="kg-card-head">
                  <span className="kg-mono">Citizen report</span>
                  <span className="kg-tag kg-tag--lime">New</span>
                </div>
                <div className="kg-imgs">
                  <span className="kg-img">IMG</span>
                  <span className="kg-img">IMG</span>
                </div>
                <p className="kg-quote">“Oil sheen near the marina jetty.”</p>
              </div>
            </div>
          </KineticStack>
        </div>
      </section>

      <section id="how-it-works" className="kg-section kg-section--divider">
        <div className="kg-container">
          <Reveal className="kg-section-head">
            <span className="kg-eyebrow-mono">The workflow</span>
            <h2>
              Report<span className="kg-flow-arrow" aria-hidden="true">→</span>Claim
              <span className="kg-flow-arrow kg-flow-arrow--late" aria-hidden="true">→</span>
              <span className="kg-grad-text">Clear</span>
            </h2>
            <p className="kg-lead">
              One shared pipeline connects everyone reporting a hazard to everyone who can do
              something about it.
            </p>
          </Reveal>
          <div className="kg-grid-3">
            {STEPS.map((step, index) => (
              <Reveal key={step.title} delay={index * 80}>
                <article className={`kg-card${index === 1 ? ' kg-card--accent' : ''}`}>
                  <span className={`kg-num kg-num--${index + 1}`}>0{index + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                  <ul className="kg-tags">
                    {step.tags.map((tag) => (
                      <li key={tag} className="kg-tag">
                        {tag}
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="kg-section kg-section--divider">
        <div className="kg-container">
          <Reveal className="kg-section-head">
            <span className="kg-eyebrow-mono">Who it&apos;s for</span>
            <h2>One platform, two ways to help</h2>
          </Reveal>
          <div className="kg-grid-2">
            <Reveal>
              <article id="for-organisations" className="kg-card kg-card--lg">
                <span className="kg-icon-badge">
                  <IconOrganisations />
                </span>
                <h3>For organisations</h3>
                <p>Run your cleanup operation from one dashboard, scoped to the area you actually cover.</p>
                <ul className="kg-checks">
                  {ORGANISATION_POINTS.map((point) => (
                    <li key={point}>
                      <span className="kg-check" aria-hidden="true">✓</span>
                      {point}
                    </li>
                  ))}
                </ul>
                <Link href="/organisations/new" className="btn btn-primary">
                  Register your organisation
                </Link>
              </article>
            </Reveal>
            <Reveal delay={80}>
              <article id="for-citizens" className="kg-card kg-card--lg">
                <span className="kg-icon-badge kg-icon-badge--violet">
                  <IconVolunteers />
                </span>
                <h3>For citizens &amp; volunteers</h3>
                <p>Reporting, tasks and events all live in the EcoTrack mobile app.</p>
                <ul className="kg-checks">
                  {CITIZEN_POINTS.map((point) => (
                    <li key={point}>
                      <span className="kg-check" aria-hidden="true">✓</span>
                      {point}
                    </li>
                  ))}
                </ul>
                <Link href="/app" className="btn btn-secondary">
                  Get the mobile app <span className="kg-arrow" aria-hidden="true">→</span>
                </Link>
              </article>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="kg-section--tight">
        <div className="kg-container">
          <Reveal>
            <div className="kg-cta">
              <div>
                <h2>Ready to clear your neighbourhood?</h2>
                <p>
                  Register your organisation to start claiming reports in your area, or get the app
                  and report the first hazard on your street.
                </p>
              </div>
              <div className="kg-actions kg-actions--flush">
                <Link href="/organisations/new" className="btn btn-primary kg-btn-lg">
                  Register your organisation
                </Link>
                <Link href="/app" className="btn btn-secondary kg-btn-lg">
                  Get the app
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
