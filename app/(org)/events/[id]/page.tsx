'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useApiGet, useAuthedFetch } from '@/lib/use-org-api';
import { Avatar, Button, Card, DetailHeader, ErrorBanner, SectionTitle, Spinner, StatusChip } from '@/components/ui';
import type { Event, EventStatus } from '@/lib/types';
import { ApiError } from '@/lib/api';
import { LocationMap } from '@/components/incident-map';

const NEXT_STATUS: Partial<Record<EventStatus, { label: string; status: EventStatus }[]>> = {
  scheduled: [
    { label: 'Mark ongoing', status: 'ongoing' },
    { label: 'Cancel event', status: 'cancelled' },
  ],
  ongoing: [
    { label: 'Mark completed', status: 'completed' },
    { label: 'Cancel event', status: 'cancelled' },
  ],
};

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { activeOrgId } = useAuth();
  const router = useRouter();
  const api = useAuthedFetch();

  const detailPath = activeOrgId ? `/organisations/${activeOrgId}/events/${id}` : null;
  const { data: event, error, mutate } = useApiGet<Event>(detailPath);

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (error) return <ErrorBanner message={error instanceof ApiError ? error.message : 'Failed to load event'} />;
  if (!event || !activeOrgId) return <Spinner />;

  async function setStatus(status: EventStatus) {
    setActionError(null);
    setBusy(true);
    try {
      await api.patch(`/organisations/${activeOrgId}/events/${event!.id}/status`, { status });
      await mutate();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not update event status');
    } finally {
      setBusy(false);
    }
  }

  const actions = NEXT_STATUS[event.status] ?? [];

  return (
    <div>
      <DetailHeader
        backHref="/events"
        backLabel="Back to events"
        title={event.title}
        chips={<StatusChip status={event.status} />}
        meta={event.description}
      />
      <div className="detail-grid">
      <div>
        <SectionTitle>When &amp; where</SectionTitle>
        <p style={{ fontSize: 13.5, color: 'var(--text-2)', marginBottom: 4 }}>
          Starts: {new Date(event.scheduledAt).toLocaleString()}
        </p>
        {event.endsAt && (
          <p style={{ fontSize: 13.5, color: 'var(--text-2)', marginBottom: 12 }}>
            Ends: {new Date(event.endsAt).toLocaleString()}
          </p>
        )}
        <LocationMap
          id={event.id}
          title={event.title}
          latitude={event.location.lat}
          longitude={event.location.lng}
        />
        <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginBottom: 20 }}>
          {event.location.lat.toFixed(5)}, {event.location.lng.toFixed(5)}
        </p>

        <SectionTitle>Linked incidents</SectionTitle>
        {event.incidents.map((incident) => (
          <Card
            key={incident.id}
            style={{ padding: 12, marginBottom: 8, cursor: 'pointer' }}
            onClick={() => router.push(`/incidents/${incident.id}`)}
          >
            <b style={{ fontSize: 13 }}>{incident.title}</b>
          </Card>
        ))}
      </div>

      <Card style={{ padding: 20 }}>
        <h3 style={{ fontSize: 15, marginBottom: 4 }}>RSVPs</h3>
        <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginBottom: 14 }}>
          {event.rsvpCount} volunteer{event.rsvpCount === 1 ? '' : 's'}
          {event.maxAttendees ? ` / ${event.maxAttendees} max` : ''}
        </p>

        {actionError && (
          <div style={{ marginBottom: 12 }}>
            <ErrorBanner message={actionError} />
          </div>
        )}

        {event.rsvps.length === 0 ? (
          <p style={{ fontSize: 13.5, color: 'var(--text-3)', marginBottom: 16 }}>No volunteers have RSVP&apos;d yet.</p>
        ) : (
          <div style={{ marginBottom: 16 }}>
            {event.rsvps.map((r) => (
              <div key={r.userId} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Avatar name={r.user?.fullName ?? '?'} />
                <span style={{ fontSize: 13.5, flex: 1 }}>{r.user?.fullName ?? 'Unknown volunteer'}</span>
              </div>
            ))}
          </div>
        )}

        {actions.length > 0 && <div style={{ borderTop: '1px solid var(--border)', margin: '10px 0 16px' }} />}
        {actions.map((action) => (
          <Button
            key={action.status}
            variant={action.status === 'cancelled' ? 'destructive' : 'secondary'}
            className="btn-block"
            style={{ marginBottom: 8 }}
            disabled={busy}
            onClick={() => setStatus(action.status)}
          >
            {action.label}
          </Button>
        ))}
      </Card>
      </div>
    </div>
  );
}
