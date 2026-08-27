'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useApiGet, useAuthedFetch } from '@/lib/use-org-api';
import { Button, Card, Chip, EmptyState, ErrorBanner, Modal, PageHeader, Spinner } from '@/components/ui';
import type { Event, Incident } from '@/lib/types';
import { ApiError } from '@/lib/api';

export default function EventsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <EventsPageInner />
    </Suspense>
  );
}

function EventsPageInner() {
  const { activeOrgId } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedIncidentId = searchParams.get('incidentId');
  const api = useAuthedFetch();
  const [showCreate, setShowCreate] = useState(() => Boolean(preselectedIncidentId));

  const eventsPath = activeOrgId ? `/organisations/${activeOrgId}/events` : null;
  const { data: events, error, mutate } = useApiGet<Event[]>(eventsPath);
  const approvedIncidentsPath = activeOrgId ? `/organisations/${activeOrgId}/incidents?status=approved` : null;
  const { data: approvedIncidents } = useApiGet<Incident[]>(approvedIncidentsPath);

  return (
    <div>
      <PageHeader
        title="Events"
        description="Community cleanup events linked to verified incidents"
        action={<Button onClick={() => setShowCreate(true)}>+ Create event</Button>}
      />

      {error && <ErrorBanner message={error instanceof ApiError ? error.message : 'Failed to load events'} />}
      {!events && !error && <Spinner />}

      {events && events.length === 0 && (
        <Card>
          <EmptyState>
            <p>No events scheduled yet.</p>
          </EmptyState>
        </Card>
      )}

      {events && events.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {events.map((event) => (
            <Card
              key={event.id}
              style={{ padding: 18, cursor: 'pointer' }}
              onClick={() => router.push(`/events/${event.id}`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <b style={{ fontSize: 14.5 }}>{event.title}</b>
                <Chip tone={event.status}>{event.status}</Chip>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 10 }}>
                {new Date(event.scheduledAt).toLocaleString()}
              </p>
              <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginBottom: 10 }}>
                {event.address ?? `${event.latitude.toFixed(5)}, ${event.longitude.toFixed(5)}`}
              </p>
              <p style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
                {event.rsvps.length} RSVP{event.rsvps.length === 1 ? '' : 's'}
                {event.maxAttendees ? ` / ${event.maxAttendees} max` : ''}
              </p>
            </Card>
          ))}
        </div>
      )}

      <CreateEventModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        organisationId={activeOrgId ?? ''}
        approvedIncidents={approvedIncidents ?? []}
        initialIncidentId={preselectedIncidentId}
        onCreated={async (eventId) => {
          setShowCreate(false);
          await mutate();
          router.push(`/events/${eventId}`);
        }}
        api={api}
      />
    </div>
  );
}

function CreateEventModal({
  open,
  onClose,
  organisationId,
  approvedIncidents,
  initialIncidentId,
  onCreated,
  api,
}: {
  open: boolean;
  onClose: () => void;
  organisationId: string;
  approvedIncidents: Incident[];
  initialIncidentId?: string | null;
  onCreated: (eventId: string) => void;
  api: ReturnType<typeof useAuthedFetch>;
}) {
  const initialIncident = approvedIncidents.find((i) => i.id === initialIncidentId);
  const [incidentIds, setIncidentIds] = useState<string[]>(initialIncidentId ? [initialIncidentId] : []);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState(initialIncident?.latitude ?? 6.9271);
  const [longitude, setLongitude] = useState(initialIncident?.longitude ?? 79.8612);
  const [address, setAddress] = useState(initialIncident?.address ?? '');
  const [scheduledAt, setScheduledAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [maxAttendees, setMaxAttendees] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleIncident(id: string) {
    setIncidentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit() {
    if (incidentIds.length === 0 || !title.trim() || !description.trim() || !scheduledAt) return;
    setSubmitting(true);
    setError(null);
    try {
      const event = await api.post<{ id: string }>(`/organisations/${organisationId}/events`, {
        incidentIds,
        title,
        description,
        latitude,
        longitude,
        address: address || undefined,
        scheduledAt: new Date(scheduledAt).toISOString(),
        endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
        maxAttendees: maxAttendees ? Number(maxAttendees) : undefined,
      });
      setIncidentIds([]);
      setTitle('');
      setDescription('');
      setScheduledAt('');
      setEndsAt('');
      setMaxAttendees('');
      onCreated(event.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create event');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create event"
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={submitting || incidentIds.length === 0 || !title.trim() || !description.trim() || !scheduledAt}
            onClick={handleSubmit}
          >
            {submitting ? 'Creating…' : 'Create event'}
          </Button>
        </>
      }
    >
      {error && (
        <div style={{ marginBottom: 12 }}>
          <ErrorBanner message={error} />
        </div>
      )}
      <div className="field">
        <label>Eligible incidents</label>
        {approvedIncidents.length === 0 ? (
          <p className="hint">No approved incidents available yet — verify an incident first.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 140, overflowY: 'auto' }}>
            {approvedIncidents.map((i) => (
              <label key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 400, fontSize: 13.5 }}>
                <input type="checkbox" checked={incidentIds.includes(i.id)} onChange={() => toggleIncident(i.id)} />
                {i.title}
              </label>
            ))}
          </div>
        )}
      </div>
      <div className="field">
        <label>Title</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" />
      </div>
      <div className="field">
        <label>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What will volunteers do at this event?"
        />
      </div>
      <div className="field">
        <label>Location</label>
        <div className="map-placeholder" style={{ height: 100, marginBottom: 8 }}>
          <span
            className="map-pin"
            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'var(--primary)' }}
          />
        </div>
        <p className="hint" style={{ marginBottom: 8 }}>
          Drag-to-place map pin isn&apos;t available in this build — enter coordinates directly.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="number"
            step="0.0001"
            value={latitude}
            onChange={(e) => setLatitude(Number(e.target.value))}
            placeholder="Latitude"
          />
          <input
            type="number"
            step="0.0001"
            value={longitude}
            onChange={(e) => setLongitude(Number(e.target.value))}
            placeholder="Longitude"
          />
        </div>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Address (optional)"
          style={{ marginTop: 8 }}
        />
      </div>
      <div className="field">
        <label>Starts</label>
        <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
      </div>
      <div className="field">
        <label>Ends</label>
        <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
      </div>
      <div className="field">
        <label>Max attendees (optional)</label>
        <input
          type="number"
          min={1}
          value={maxAttendees}
          onChange={(e) => setMaxAttendees(e.target.value)}
          placeholder="Unlimited"
        />
      </div>
    </Modal>
  );
}
