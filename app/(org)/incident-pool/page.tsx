'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useApiGet, useAuthedFetch } from '@/lib/use-org-api';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorBanner,
  FilterBar,
  FilterPanel,
  FilterPill,
  Modal,
  PageHeader,
  Pagination,
  SearchInput,
  Spinner,
  UrgencyBadge,
} from '@/components/ui';
import { IncidentMap, LocationMap } from '@/components/incident-map';
import type { IncidentCategory, IncidentSeverity, Organisation, PoolIncident } from '@/lib/types';
import { ApiError } from '@/lib/api';
import { thumbGradient } from '@/lib/thumb-gradients';
import { filterPool, paginate, sortPool, type PoolFilters, type PoolSort } from '@/lib/pool-filters';
import { relativeAge } from '@/lib/format';

const PAGE_SIZE = 12;

const CATEGORIES: IncidentCategory[] = [
  'illegal_dumping',
  'water_pollution',
  'air_pollution',
  'deforestation',
  'wildlife_hazard',
  'other',
];
const SEVERITIES: IncidentSeverity[] = ['low', 'medium', 'high', 'critical'];

function categoryLabel(category: IncidentCategory) {
  return category.replace(/_/g, ' ');
}

function toggleInSet<T>(set: ReadonlySet<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export default function IncidentPoolPage() {
  const { activeOrgId } = useAuth();
  const api = useAuthedFetch();
  const [page, setPage] = useState(1);
  const [selectedIncident, setSelectedIncident] = useState<PoolIncident | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<ReadonlySet<IncidentCategory>>(new Set());
  const [severities, setSeverities] = useState<ReadonlySet<IncidentSeverity>>(new Set());
  const [maxDistanceKm, setMaxDistanceKm] = useState<number | null>(null);
  const [sort, setSort] = useState<PoolSort>('distance');

  const poolPath = activeOrgId ? '/incidents/pool' : null;
  const { data: pool, error, mutate } = useApiGet<PoolIncident[]>(poolPath);
  const orgPath = activeOrgId ? `/organisations/${activeOrgId}` : null;
  const { data: organisation } = useApiGet<Organisation>(orgPath);

  // The pool endpoint already scopes to the org's service area, so this slider
  // narrows within that -- it can't reach further than the org already sees.
  const sliderMaxKm = useMemo(() => {
    if (organisation?.serviceAreaRadiusKm) return organisation.serviceAreaRadiusKm;
    const farthest = Math.max(0, ...(pool ?? []).map((incident) => incident.distanceMeters / 1000));
    return Math.ceil(farthest) || 1;
  }, [organisation, pool]);

  async function claimIncident() {
    if (!selectedIncident) return;
    setClaiming(true);
    setClaimError(null);
    try {
      await api.post(`/incidents/pool/${selectedIncident.id}/claim`);
      setSelectedIncident(null);
      await mutate();
    } catch (err) {
      setClaimError(err instanceof ApiError ? err.message : 'Could not claim this incident');
    } finally {
      setClaiming(false);
    }
  }

  const filters: PoolFilters = useMemo(
    () => ({
      query,
      categories,
      severities,
      maxDistanceMeters: maxDistanceKm !== null ? maxDistanceKm * 1000 : null,
    }),
    [query, categories, severities, maxDistanceKm],
  );

  const visible = useMemo(() => sortPool(filterPool(pool ?? [], filters), sort), [pool, filters, sort]);
  const activeFilterCount =
    (query.trim() ? 1 : 0) + categories.size + severities.size + (maxDistanceKm !== null ? 1 : 0);
  const { items: pageItems, page: currentPage, pageCount } = paginate(visible, page, PAGE_SIZE);

  const mapIncidents = useMemo(
    () =>
      visible.map((incident) => ({
        id: incident.id,
        title: incident.title,
        lat: incident.lat,
        lng: incident.lng,
        address: incident.address,
        verificationStatus: null,
      })),
    [visible],
  );

  function resetFilters() {
    setQuery('');
    setCategories(new Set());
    setSeverities(new Set());
    setMaxDistanceKm(null);
    setPage(1);
  }

  return (
    <div>
      <PageHeader
        title="Incident Pool"
        description="Unclaimed incidents reported within your organisation's registered service area"
      />

      {error && <ErrorBanner message={error instanceof ApiError ? error.message : 'Failed to load the incident pool'} />}
      {!pool && !error && <Spinner />}

      {pool && pool.length === 0 && (
        <Card>
          <EmptyState>
            <p>No unclaimed incidents in your service area right now.</p>
          </EmptyState>
        </Card>
      )}

      {pool && pool.length > 0 && (
        <>
          <FilterPanel activeCount={activeFilterCount} onReset={resetFilters}>
            <SearchInput
              value={query}
              onChange={(value) => {
                setQuery(value);
                setPage(1);
              }}
              label="Search the incident pool"
              placeholder="Search by title or address"
              hint="Filters the incidents already loaded in your service area."
            />
            <div className="pool-distance">
              <label htmlFor="pool-distance-slider">
                {maxDistanceKm === null ? `Within ${sliderMaxKm} km` : `Within ${maxDistanceKm} km`}
              </label>
              <input
                id="pool-distance-slider"
                type="range"
                min={0}
                max={sliderMaxKm}
                step={1}
                value={maxDistanceKm ?? sliderMaxKm}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setMaxDistanceKm(value >= sliderMaxKm ? null : value);
                  setPage(1);
                }}
              />
            </div>
            <select
              aria-label="Sort incidents"
              className="filter-control"
              value={sort}
              onChange={(event) => setSort(event.target.value as PoolSort)}
            >
              <option value="distance">Nearest first</option>
              <option value="newest">Newest first</option>
              <option value="severity">Most severe first</option>
            </select>
          </FilterPanel>

          <FilterBar>
            {CATEGORIES.map((category) => (
              <FilterPill
                key={category}
                active={categories.has(category)}
                onClick={() => {
                  setCategories((current) => toggleInSet(current, category));
                  setPage(1);
                }}
              >
                {categoryLabel(category)}
              </FilterPill>
            ))}
          </FilterBar>
          <FilterBar>
            {SEVERITIES.map((severity) => (
              <FilterPill
                key={severity}
                active={severities.has(severity)}
                onClick={() => {
                  setSeverities((current) => toggleInSet(current, severity));
                  setPage(1);
                }}
              >
                {severity}
              </FilterPill>
            ))}
          </FilterBar>

          <Card style={{ padding: 20, marginBottom: 20 }}>
            <h2 style={{ fontSize: 15, marginBottom: 12 }}>Incidents in your service area</h2>
            <IncidentMap incidents={mapIncidents} />
          </Card>

          {visible.length === 0 ? (
            <Card>
              <EmptyState>
                <p>No incidents match these filters.</p>
              </EmptyState>
            </Card>
          ) : (
            <>
              <div className="pool-grid">
                {pageItems.map((incident, i) => (
                  <Card
                    key={incident.id}
                    className="pool-card"
                    onClick={() => setSelectedIncident(incident)}
                  >
                    <div className="pool-card-band" style={{ background: thumbGradient(i) }} aria-hidden="true" />
                    <div className="pool-card-body">
                      <h3 className="pool-card-title">{incident.title}</h3>
                      <p className="pool-card-desc">{incident.description}</p>
                      <div className="pool-card-chips">
                        <Chip tone="neutral">{categoryLabel(incident.category)}</Chip>
                        <UrgencyBadge severity={incident.severity} />
                      </div>
                      <div className="pool-card-footer">
                        <span>{(incident.distanceMeters / 1000).toFixed(1)} km</span>
                        <span>{relativeAge(incident.createdAt)}</span>
                      </div>
                      <Button
                        size="sm"
                        className="btn-block"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedIncident(incident);
                        }}
                      >
                        Claim incident
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
              <Pagination
                page={currentPage}
                pageCount={pageCount}
                totalItems={visible.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
              />
            </>
          )}
        </>
      )}

      <IncidentDetailModal
        incident={selectedIncident}
        onClose={() => setSelectedIncident(null)}
        claiming={claiming}
        claimError={claimError}
        onClaim={claimIncident}
      />
    </div>
  );
}

function IncidentDetailModal({
  incident,
  onClose,
  claiming,
  claimError,
  onClaim,
}: {
  incident: PoolIncident | null;
  onClose: () => void;
  claiming: boolean;
  claimError: string | null;
  onClaim: () => void;
}) {
  if (!incident) return null;

  return (
    <Modal
      open={Boolean(incident)}
      onClose={onClose}
      title={incident.title}
      actions={
        <>
          {claimError && <ErrorBanner message={claimError} />}
          <Button variant="secondary" onClick={onClose} disabled={claiming}>Close</Button>
          <Button onClick={onClaim} disabled={claiming}>
            {claiming ? 'Claiming...' : 'Claim incident'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <Chip tone="neutral">{categoryLabel(incident.category)}</Chip>
        <UrgencyBadge severity={incident.severity} />
      </div>

      <p style={{ fontSize: 13.5, color: 'var(--text-2)', marginBottom: 16 }}>{incident.description}</p>

      <LocationMap
        id={incident.id}
        title={incident.title}
        latitude={incident.lat}
        longitude={incident.lng}
        address={incident.address}
      />
      <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginBottom: 16 }}>
        {incident.lat.toFixed(5)}, {incident.lng.toFixed(5)}
        {incident.address && ` — ${incident.address}`}
      </p>
    </Modal>
  );
}
