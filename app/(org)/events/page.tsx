'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useApiGet, useAuthedFetch } from '@/lib/use-org-api';
import { Button, Card, Chip, EmptyState, ErrorBanner, FieldError, Modal, PageHeader, Spinner } from '@/components/ui';
import type { Event, Incident } from '@/lib/types';
import { ApiError } from '@/lib/api';
import { useTranslation } from 'react-i18next';
import { useFieldValidation, required } from '@/lib/use-field-validation';
import { LocationMap } from '@/components/incident-map';

// Main Events page component - Shows loading spinner while the page content is being fetched
export default function EventsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <EventsPageInner />
    </Suspense>
  );
}

// Main page content - Loads and displays all events for the organization, with ability to create new events
function EventsPageInner() {
  const { activeOrgId } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedIncidentId = searchParams.get('incidentId');
  const api = useAuthedFetch();
  const [showCreate, setShowCreate] = useState(() => Boolean(preselectedIncidentId));

  // Fetch all events for this organization from the backend
  const eventsPath = activeOrgId ? `/organisations/${activeOrgId}/events` : null;
  const { data: events, error, mutate } = useApiGet<Event[]>(eventsPath);
  
  // Fetch approved incidents to link them to new events
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
  const { t } = useTranslation();
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
  const incidentsValidation = useFieldValidation(required(t('events.createModal.incidentsRequired')));//validation for incidents selection
  const titleValidation = useFieldValidation(required(t('events.createModal.titleRequired')));//validation for title
  const descriptionValidation = useFieldValidation(required(t('events.createModal.descriptionRequired')));//validation for description
  const startValidation = useFieldValidation(required(t('events.createModal.startRequired')));//validation for start date

  // Toggle incident selection on/off when user checks/unchecks a checkbox
  function toggleIncident(id: string) {
    setIncidentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  // Create the event by sending data to backend and then refresh the events list
  async function handleSubmit() {
    // Check all required fields are filled before allowing submission
    if (incidentIds.length === 0 || !title.trim() || !description.trim() || !scheduledAt) return;
    setSubmitting(true);
    setError(null);
    try {
      // Send event data to backend API to create new event
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
      // Clear all form fields after successful creation
      setIncidentIds([]);
      setTitle('');
      setDescription('');
      setScheduledAt('');
      setEndsAt('');
      setMaxAttendees('');
      // Notify parent component that event was created and pass the new event ID
      onCreated(event.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create event');
    } finally {
      setSubmitting(false);
    }
  }

  // Render the modal dialog for creating a new event
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('events.createModal.title')}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            disabled={submitting || incidentIds.length === 0 || !title.trim() || !description.trim() || !scheduledAt}
            onClick={handleSubmit}
          >
            {submitting ? t('events.createModal.creating') : t('events.createModal.submit')}
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
        <span className="field-label">{t('events.createModal.eligibleIncidents')}</span>
        {approvedIncidents.length === 0 ? (
          <p className="hint">{t('events.createModal.noIncidents')}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 140, overflowY: 'auto' }}>
            {approvedIncidents.map((i) => (
              <label key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 400, fontSize: 13.5 }}>
                <input type="checkbox" checked={incidentIds.includes(i.id)} aria-describedby={incidentsValidation.error ? 'event-incidents-error' : undefined} onChange={() => toggleIncident(i.id)} onBlur={() => incidentsValidation.onBlur(incidentIds.join(','))} />
                {i.title}
              </label>
            ))}
          </div>
        )}
        <FieldError id="event-incidents-error" message={incidentsValidation.error} />
      </div>
      <div className="field">
        <label htmlFor="create-event-title">{t('events.createModal.titleLabel')}</label>
        <input id="create-event-title" aria-invalid={Boolean(titleValidation.error)} aria-describedby={titleValidation.error ? 'event-title-error' : undefined} type="text" value={title} onChange={(e) => { setTitle(e.target.value); titleValidation.revalidate(e.target.value); }} onBlur={(e) => titleValidation.onBlur(e.target.value)} placeholder={t('events.createModal.titlePlaceholder')} />
        <FieldError id="event-title-error" message={titleValidation.error} />
      </div>
      <div className="field">
        <label htmlFor="create-event-description">{t('events.createModal.descriptionLabel')}</label>
        <textarea
          id="create-event-description"
          aria-invalid={Boolean(descriptionValidation.error)}
          aria-describedby={descriptionValidation.error ? 'event-description-error' : undefined}
          value={description}
          onChange={(e) => { setDescription(e.target.value); descriptionValidation.revalidate(e.target.value); }}
          onBlur={(e) => descriptionValidation.onBlur(e.target.value)}
          placeholder={t('events.createModal.descriptionPlaceholder')}
        />
        <FieldError id="event-description-error" message={descriptionValidation.error} />
      </div>
      <div className="field">
        <label>Location</label>
        <LocationMap id="new-event" title={title || 'New event'} latitude={latitude} longitude={longitude} address={address} />
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
        <label htmlFor="create-event-start">Starts</label>
        <input id="create-event-start" aria-invalid={Boolean(startValidation.error)} aria-describedby={startValidation.error ? 'event-start-error' : undefined} type="datetime-local" value={scheduledAt} onChange={(e) => { setScheduledAt(e.target.value); startValidation.revalidate(e.target.value); }} onBlur={(e) => startValidation.onBlur(e.target.value)} />
        <FieldError id="event-start-error" message={startValidation.error} />
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
/* When the Events page loads, it gets the active organization ID from useAuth(). 
It then uses useApiGet() to fetch the organization's events and approved incidents. 
The events are displayed as cards. When the user clicks Create Event, the modal opens. 
The user selects approved incidents and enters the event information. 
When they submit, handleSubmit() validates the required fields and uses useAuthedFetch() 
to send an authenticated POST request to /organisations/{organisationId}/events. 
The backend creates the event and returns its ID. 
The frontend then closes the modal, calls mutate() to refresh the events, and navigates to /events/{eventId}. */