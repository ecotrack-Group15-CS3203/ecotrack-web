'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useApiGet, useAuthedFetch } from '@/lib/use-org-api';
import { Avatar, Button, Card, Chip, ErrorBanner, SectionTitle, Spinner } from '@/components/ui';
import type { Event, EventStatus } from '@/lib/types';
import { ApiError } from '@/lib/api';
import { LocationMap } from '@/components/incident-map';

// Mapping of current event status to possible next actions
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

// Event detail page component
export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { activeOrgId } = useAuth();
  const router = useRouter();
  const api = useAuthedFetch();

  const detailPath = activeOrgId ? `/organisations/${activeOrgId}/events/${id}` : null;// Path to fetch event details for the active organisation and event ID
  const { data: event, error, mutate } = useApiGet<Event>(detailPath);// Fetch event details using the API hook

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (error) return <ErrorBanner message={error instanceof ApiError ? error.message : 'Failed to load event'} />;
  if (!event || !activeOrgId) return <Spinner />;

  // Function to update the status of the event
  async function setStatus(status: EventStatus) {
    setActionError(null);
    setBusy(true);
    try {
      await api.patch(`/organisations/${activeOrgId}/events/${event!.id}/status`, { status });// Update the event status via the API
      await mutate();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not update event status');
    } finally {
      setBusy(false);
    }
  }

  // Determine the possible next actions based on the current event status
  const actions = NEXT_STATUS[event.status] ?? [];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 22, alignItems: 'start' }}>
      <div>
        <Button variant="text" onClick={() => router.push('/events')} style={{ marginBottom: 10 }}>
          ← Back to events
        </Button>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <Chip tone={event.status}>{event.status}</Chip>
        </div>
        <h1 style={{ fontSize: 19 }}>{event.title}</h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-2)', margin: '10px 0 16px' }}>{event.description}</p>
        {/* When and where section */}
        <SectionTitle>When &amp; where</SectionTitle>
        <p style={{ fontSize: 13.5, color: 'var(--text-2)', marginBottom: 4 }}>
          Starts: {new Date(event.scheduledAt).toLocaleString()}
        </p>
        {event.endsAt && (
          <p style={{ fontSize: 13.5, color: 'var(--text-2)', marginBottom: 12 }}>
            Ends: {new Date(event.endsAt).toLocaleString()}
          </p>
        )}
        {/* Location section */}
        <LocationMap
          id={event.id}
          title={event.title}
          latitude={event.latitude}
          longitude={event.longitude}
          address={event.address}
        />
        <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginBottom: 20 }}>
          {event.latitude.toFixed(5)}, {event.longitude.toFixed(5)}
          {event.address && ` — ${event.address}`}
        </p>

        {/* Linked incidents section */}
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

      {/* RSVPs section */}
      <Card style={{ padding: 20 }}>
        <h3 style={{ fontSize: 15, marginBottom: 4 }}>RSVPs</h3>
        <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginBottom: 14 }}>
          {event.rsvps.length} volunteer{event.rsvps.length === 1 ? '' : 's'}
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
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Avatar name={r.volunteer.fullName} />
                <span style={{ fontSize: 13.5, flex: 1 }}>{r.volunteer.fullName}</span>
              </div>
            ))}
          </div>
        )}
        {/* Actions section */}
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
  );
}
/* First, the page gets the event ID from the URL using use(params). 
Then it gets the active organization ID from the authentication context. 
Using these two IDs, it creates the event detail API endpoint and fetches the event using useApiGet. 
While loading it displays a spinner, and if there is an error it displays an error banner. 
Once the event is loaded, it displays the event's status, title, description, location, linked incidents, and RSVPs. 
The user can also change the event status. W
hen they click a status button, the page sends a PATCH request to the status endpoint. 
After the backend updates the status, mutate() refreshes the event data so the UI shows the latest status. */