'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useApiGet, useAuthedFetch } from '@/lib/use-org-api';
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  FieldError,
  FilterBar,
  FilterPanel,
  FilterPill,
  Modal,
  PageHeader,
  ProgressBar,
  SearchInput,
  Skeleton,
  StatusChip,
} from '@/components/ui';
import { thumbGradient } from '@/lib/thumb-gradients';
import { formatDateTime } from '@/lib/format';
import { filterAndSortEvents } from '@/lib/event-filters';
import type { EventStatus, EventSummary, IncidentSummary, Paginated } from '@/lib/types';
import { ApiError } from '@/lib/api';
import { useTranslation } from 'react-i18next';
import { useFieldValidation, required } from '@/lib/use-field-validation';
import { LocationPicker, type ReferencePoint } from '@/components/location-picker';
import { autoEventLocation } from '@/lib/event-location';

const STATUS_FILTERS: EventStatus[] = ['scheduled', 'ongoing', 'completed', 'cancelled'];

export default function EventsPage() {
  return (
    <Suspense fallback={<Skeleton height={96} />}>
      <EventsPageInner />
    </Suspense>
  );
}

function EventsPageInner() {
  const { t } = useTranslation();
  const { activeOrgId } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedIncidentId = searchParams.get('incidentId');
  const api = useAuthedFetch();
  const [showCreate, setShowCreate] = useState(() => Boolean(preselectedIncidentId));
  const [statusFilter, setStatusFilter] = useState<'all' | EventStatus>('all');
  const [upcomingOnly, setUpcomingOnly] = useState(false);
  const [search, setSearch] = useState('');

  // limit=100 on both: this page lists every event with no pagination
  // controls, and the incident picker in "Create event" needs every eligible
  // incident, not just the first page.
  const eventsPath = activeOrgId ? `/organisations/${activeOrgId}/events?limit=100` : null;
  const { data: eventsPage, error, mutate } = useApiGet<Paginated<EventSummary>>(eventsPath);
  const events = eventsPage?.items;
  // Only incidents the Workflow Stage Rules allow an event from (on the required
  // stage, not final).
  const eligibleIncidentsPath = activeOrgId
    ? `/organisations/${activeOrgId}/incidents?status=approved&eligibleFor=eventCreation&limit=100`
    : null;
  const { data: eligibleIncidentsPage, mutate: mutateEligibleIncidents } =
    useApiGet<Paginated<IncidentSummary>>(eligibleIncidentsPath);
  const eligibleIncidents = eligibleIncidentsPage?.items;

  const filteredEvents = useMemo(
    () => (events ? filterAndSortEvents(events, { status: statusFilter, upcomingOnly, query: search }) : []),
    [events, statusFilter, upcomingOnly, search],
  );

  const activeFilterCount = (statusFilter !== 'all' ? 1 : 0) + (upcomingOnly ? 1 : 0) + (search.trim() ? 1 : 0);

  function resetFilters() {
    setStatusFilter('all');
    setUpcomingOnly(false);
    setSearch('');
  }

  return (
    <div>
      <PageHeader
        title={t('events.title')}
        description={t('events.description')}
        action={<Button onClick={() => setShowCreate(true)}>{t('events.createEvent')}</Button>}
      />

      {error && <ErrorBanner message={error instanceof ApiError ? error.message : t('events.loadError')} />}

      <FilterPanel activeCount={activeFilterCount} onReset={resetFilters}>
        <FilterBar>
          <FilterPill active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
            {t('events.filters.all')}
          </FilterPill>
          {STATUS_FILTERS.map((status) => (
            <FilterPill key={status} active={statusFilter === status} onClick={() => setStatusFilter(status)}>
              {t(`common.status.${status}`)}
            </FilterPill>
          ))}
          <FilterPill active={upcomingOnly} onClick={() => setUpcomingOnly((prev) => !prev)}>
            {t('events.filters.upcomingOnly')}
          </FilterPill>
        </FilterBar>
        <SearchInput
          value={search}
          onChange={setSearch}
          label={t('events.filters.searchLabel')}
          placeholder={t('events.filters.searchPlaceholder')}
          hint={t('events.filters.searchHint')}
        />
      </FilterPanel>

      {!events && !error && (
        <div className="pool-grid">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card className="pool-card" key={i}>
              <Skeleton height={140} />
            </Card>
          ))}
        </div>
      )}

      {events && filteredEvents.length === 0 && (
        <Card>
          <EmptyState>
            <p>{events.length === 0 ? t('events.empty') : t('events.emptyFiltered')}</p>
          </EmptyState>
        </Card>
      )}

      {filteredEvents.length > 0 && (
        <div className="pool-grid">
          {filteredEvents.map((event, i) => (
            <Card
              key={event.id}
              className="pool-card"
              onClick={() => router.push(`/events/${event.id}`)}
            >
              <div className="pool-card-band" style={{ background: thumbGradient(i) }} aria-hidden="true" />
              <div className="pool-card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <span className="pool-card-title">{event.title}</span>
                  <StatusChip status={event.status} />
                </div>
                <p className="pool-card-desc" style={{ WebkitLineClamp: 1 }}>{formatDateTime(event.scheduledAt)}</p>
                {event.maxAttendees ? (
                  <ProgressBar
                    segments={[
                      {
                        value: event.rsvpCount,
                        color: 'var(--primary)',
                        label: t('events.card.spotsFilled', { count: event.rsvpCount, max: event.maxAttendees }),
                      },
                    ]}
                    max={event.maxAttendees}
                    showLegend={false}
                    height={8}
                  />
                ) : null}
                <div className="pool-card-footer">
                  <span>
                    {event.maxAttendees
                      ? t('events.card.spotsFilled', { count: event.rsvpCount, max: event.maxAttendees })
                      : t(
                          event.rsvpCount === 1 ? 'events.card.unlimitedCapacitySingular' : 'events.card.unlimitedCapacityPlural',
                          { count: event.rsvpCount },
                        )}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateEventModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        organisationId={activeOrgId ?? ''}
        eligibleIncidents={eligibleIncidents ?? []}
        initialIncidentId={preselectedIncidentId}
        onCreated={async (eventId) => {
          setShowCreate(false);
          await Promise.all([mutate(), mutateEligibleIncidents()]);
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
  eligibleIncidents,
  initialIncidentId,
  onCreated,
  api,
}: {
  open: boolean;
  onClose: () => void;
  organisationId: string;
  eligibleIncidents: IncidentSummary[];
  initialIncidentId?: string | null;
  onCreated: (eventId: string) => void;
  api: ReturnType<typeof useAuthedFetch>;
}) {
  const { t } = useTranslation();
  const initialIncident = eligibleIncidents.find((i) => i.id === initialIncidentId);
  const [rawIncidentIds, setIncidentIds] = useState<string[]>(initialIncidentId ? [initialIncidentId] : []);
  // A preselected incident (?incidentId= from the incident page) that isn't
  // eligible for an event right now is dropped rather than submitted into a 422.
  const incidentIds = rawIncidentIds.filter((id) => eligibleIncidents.some((i) => i.id === id));
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState(initialIncident?.location.lat ?? 6.9271);
  const [longitude, setLongitude] = useState(initialIncident?.location.lng ?? 79.8612);
  // Until the organiser places the pin themselves, it follows the first ticked incident.
  const [locationTouched, setLocationTouched] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [maxAttendees, setMaxAttendees] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const incidentsValidation = useFieldValidation(required(t('events.createModal.incidentsRequired')));
  const titleValidation = useFieldValidation(required(t('events.createModal.titleRequired')));
  const descriptionValidation = useFieldValidation(required(t('events.createModal.descriptionRequired')));
  const startValidation = useFieldValidation(required(t('events.createModal.startRequired')));
  const endValidation = useFieldValidation(required(t('events.createModal.endRequired')));

  const referencePoints = useMemo<ReferencePoint[]>(
    () =>
      eligibleIncidents
        .filter((i) => incidentIds.includes(i.id))
        .map((i) => ({ id: i.id, title: i.title, lat: i.location.lat, lng: i.location.lng })),
    [eligibleIncidents, incidentIds],
  );

  function toggleIncident(id: string) {
    const next = incidentIds.includes(id) ? incidentIds.filter((x) => x !== id) : [...incidentIds, id];
    setIncidentIds(next);
    if (!locationTouched) {
      const auto = autoEventLocation(next, eligibleIncidents);
      if (auto) {
        setLatitude(auto.lat);
        setLongitude(auto.lng);
      }
    }
  }

  async function handleSubmit() {
    if (incidentIds.length === 0 || !title.trim() || !description.trim() || !scheduledAt || !endsAt) return;
    setSubmitting(true);
    setError(null);
    try {
      const event = await api.post<{ id: string }>(`/organisations/${organisationId}/events`, {
        incidentIds,
        title,
        description,
        location: { lat: latitude, lng: longitude },
        scheduledAt: new Date(scheduledAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        maxAttendees: maxAttendees ? Number(maxAttendees) : undefined,
      });
      setIncidentIds([]);
      setLocationTouched(false);
      setTitle('');
      setDescription('');
      setScheduledAt('');
      setEndsAt('');
      setMaxAttendees('');
      onCreated(event.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('events.createModal.createError'));
    } finally {
      setSubmitting(false);
    }
  }

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
            disabled={submitting || incidentIds.length === 0 || !title.trim() || !description.trim() || !scheduledAt || !endsAt}
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
        {eligibleIncidents.length === 0 ? (
          <p className="hint">{t('events.createModal.noIncidents')}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 140, overflowY: 'auto' }}>
            {eligibleIncidents.map((i) => (
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
        <label>{t('events.createModal.locationLabel')}</label>
        <LocationPicker
          title={title || t('events.createModal.newEventTitle')}
          latitude={latitude}
          longitude={longitude}
          referencePoints={referencePoints}
          onChange={({ lat, lng }) => {
            setLocationTouched(true);
            setLatitude(lat);
            setLongitude(lng);
          }}
        />
      </div>
      <div className="field">
        <label htmlFor="create-event-start">{t('events.createModal.startsLabel')}</label>
        <input id="create-event-start" aria-invalid={Boolean(startValidation.error)} aria-describedby={startValidation.error ? 'event-start-error' : undefined} type="datetime-local" value={scheduledAt} onChange={(e) => { setScheduledAt(e.target.value); startValidation.revalidate(e.target.value); }} onBlur={(e) => startValidation.onBlur(e.target.value)} />
        <FieldError id="event-start-error" message={startValidation.error} />
      </div>
      <div className="field">
        <label htmlFor="create-event-end">{t('events.createModal.endsLabel')}</label>
        <input id="create-event-end" aria-invalid={Boolean(endValidation.error)} aria-describedby={endValidation.error ? 'event-end-error' : undefined} type="datetime-local" value={endsAt} onChange={(e) => { setEndsAt(e.target.value); endValidation.revalidate(e.target.value); }} onBlur={(e) => endValidation.onBlur(e.target.value)} />
        <FieldError id="event-end-error" message={endValidation.error} />
      </div>
      <div className="field">
        <label>{t('events.createModal.maxAttendeesLabel')}</label>
        <input
          type="number"
          min={1}
          value={maxAttendees}
          onChange={(e) => setMaxAttendees(e.target.value)}
          placeholder={t('common.unlimited')}
        />
      </div>
    </Modal>
  );
}
