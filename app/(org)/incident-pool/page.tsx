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
  Modal,
  PageHeader,
  Spinner,
  TableThumb,
  UrgencyBadge,
} from '@/components/ui';
import { IncidentMap, LocationMap } from '@/components/incident-map';
import type { PoolIncident } from '@/lib/types';
import { ApiError } from '@/lib/api';
import { thumbGradient } from '@/lib/thumb-gradients';

const PAGE_SIZE = 5;

export default function IncidentPoolPage() {
  const { activeOrgId } = useAuth();
  const api = useAuthedFetch();
  const [page, setPage] = useState(1);
  const [selectedIncident, setSelectedIncident] = useState<PoolIncident | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const poolPath = activeOrgId ? '/incidents/pool' : null;
  const { data: pool, error, mutate } = useApiGet<PoolIncident[]>(poolPath);

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

  // Already distance-sorted server-side; keep the client sort stable across re-fetches.
  const sorted = useMemo(() => (pool ?? []).slice().sort((a, b) => a.distanceMeters - b.distanceMeters), [pool]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const mapIncidents = useMemo(
    () =>
      (pool ?? []).map((incident) => ({
        id: incident.id,
        title: incident.title,
        lat: incident.lat,
        lng: incident.lng,
        address: incident.address,
        verificationStatus: null,
      })),
    [pool],
  );

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
          <Card style={{ padding: 20, marginBottom: 20 }}>
            <h2 style={{ fontSize: 15, marginBottom: 12 }}>Incidents in your service area</h2>
            <IncidentMap incidents={mapIncidents} />
          </Card>
          <Card>
            <table>
            <thead>
              <tr>
                <th></th>
                <th>ID</th>
                <th>Title</th>
                <th>Urgency</th>
                <th>Submitted</th>
                <th>Distance</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((incident, i) => (
                <tr key={incident.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedIncident(incident)}>
                  <td>
                    <TableThumb gradient={thumbGradient(i)} />
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{incident.id}</td>
                  <td>{incident.title}</td>
                  <td>
                    <UrgencyBadge severity={incident.severity} />
                  </td>
                  <td>{new Date(incident.createdAt).toLocaleString()}</td>
                  <td>{(incident.distanceMeters / 1000).toFixed(1)} km</td>
                </tr>
              ))}
            </tbody>
            </table>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '14px 0' }}>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  className={`filter-pill ${page === i + 1 ? 'active' : ''}`}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
          </Card>
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
        <Chip tone="neutral">{incident.category.replace(/_/g, ' ')}</Chip>
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
