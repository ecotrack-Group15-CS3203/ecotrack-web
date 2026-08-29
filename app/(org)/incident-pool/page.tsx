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
import { distanceKm } from '@/lib/geo';
import type { Incident, Organisation } from '@/lib/types';
import { ApiError, absoluteUrl } from '@/lib/api';

const PAGE_SIZE = 5;

const THUMB_GRADIENTS = [
  'linear-gradient(135deg,#F0997B,#D85A30)',
  'linear-gradient(135deg,#85B7EB,#378ADD)',
  'linear-gradient(135deg,#97C459,#639922)',
];

export default function IncidentPoolPage() {
  const { activeOrgId } = useAuth();
  const api = useAuthedFetch();
  const [page, setPage] = useState(1);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [claiming, setClaiming] = useState(false);// Indicates whether an incident is currently being claimed
  const [claimError, setClaimError] = useState<string | null>(null);

  const orgPath = activeOrgId ? `/organisations/${activeOrgId}` : null;// API endpoint for the active organisation's details
  const { data: organisation } = useApiGet<Organisation>(orgPath);
  const poolPath = activeOrgId ? `/organisations/${activeOrgId}/incidents/incident-pool` : null;// API endpoint for the incident pool of the active organisation
  const { data: pool, error, mutate } = useApiGet<Incident[]>(poolPath);

  // Function to claim an incident from the pool
  async function claimIncident() {
    if (!activeOrgId || !selectedIncident) return;
    setClaiming(true);
    setClaimError(null);
    try {
      await api.post(`/organisations/${activeOrgId}/incidents/${selectedIncident.id}/claim`);// API call to claim the selected incident
      setSelectedIncident(null);
      await mutate();
    } catch (err) {
      setClaimError(err instanceof ApiError ? err.message : 'Could not claim this incident');
    } finally {
      setClaiming(false);
    }
  }

  const sorted = useMemo(
    () => (pool ?? []).slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [pool],
  );
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const center = organisation?.serviceArea;

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
            <IncidentMap incidents={pool} />
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
            {/* Table body containing the incidents in the current page */}
            <tbody>
              {pageItems.map((incident, i) => (
                <tr key={incident.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedIncident(incident)}>
                  <td>
                    <TableThumb gradient={THUMB_GRADIENTS[i % THUMB_GRADIENTS.length]} />
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{incident.id}</td>
                  <td>{incident.title}</td>
                  <td>
                    <UrgencyBadge severity={incident.severity} />
                  </td>
                  <td>{new Date(incident.createdAt).toLocaleString()}</td>
                  <td>
                    {center
                      ? `${distanceKm(center.latitude, center.longitude, incident.latitude, incident.longitude).toFixed(1)} km`
                      : '—'}
                  </td>
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
  {/* Incident detail modal for the selected incident */}
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

// Modal component for displaying detailed information about a selected incident
function IncidentDetailModal({
  incident,
  onClose,
  claiming,
  claimError,
  onClaim,
}: {
  incident: Incident | null;
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

      {incident.images[0] && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={absoluteUrl(incident.images[0].url)}
          alt=""
          style={{ width: '100%', height: 180, borderRadius: 10, objectFit: 'cover', marginBottom: 16 }}
        />
      )}
      {incident.images.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {incident.images.slice(1).map((img) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={img.id}
              src={absoluteUrl(img.url)}
              alt=""
              style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover' }}
            />
          ))}
        </div>
      )}
      {/* display the location of the incident on a map */}
      <LocationMap
        id={incident.id}
        title={incident.title}
        latitude={incident.latitude}
        longitude={incident.longitude}
        address={incident.address}
      />
      {/* display the latitude and longitude of the incident */}
      <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginBottom: 16 }}>
        {incident.latitude.toFixed(5)}, {incident.longitude.toFixed(5)}
        {incident.address && ` — ${incident.address}`}
      </p>
      {/* display the reporter information if available */}
      {incident.reporter && (
        <>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Reporter</p>
          <p style={{ fontSize: 13, color: 'var(--text-2)' }}>{incident.reporter.fullName}</p>
          <p style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{incident.reporter.email}</p>
        </>
      )}
    </Modal>
  );
}
