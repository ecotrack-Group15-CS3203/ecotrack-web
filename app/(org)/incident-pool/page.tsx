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
  Toast,
  UrgencyBadge,
} from '@/components/ui';
import { IconPin } from '@/components/icons';
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const orgPath = activeOrgId ? `/organisations/${activeOrgId}` : null;
  const { data: organisation } = useApiGet<Organisation>(orgPath);
  const poolPath = activeOrgId ? `/organisations/${activeOrgId}/incident-pool` : null;
  const { data: pool, error, mutate } = useApiGet<Incident[]>(poolPath);

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
      )}

      <IncidentDetailModal
        incident={selectedIncident}
        onClose={() => setSelectedIncident(null)}
        organisationId={activeOrgId ?? ''}
        api={api}
        onClaimed={async () => {
          setSelectedIncident(null);
          setToastMessage('Incident claimed successfully.');
          await mutate();
        }}
        onClaimError={(message) => setToastMessage(message)}
      />

      {toastMessage && <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />}
    </div>
  );
}

function IncidentDetailModal({
  incident,
  onClose,
  organisationId,
  api,
  onClaimed,
  onClaimError,
}: {
  incident: Incident | null;
  onClose: () => void;
  organisationId: string;
  api: ReturnType<typeof useAuthedFetch>;
  onClaimed: () => void;
  onClaimError: (message: string) => void;
}) {
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!incident) return null;

  async function claim() {
    setClaiming(true);
    setError(null);
    try {
      await api.post(`/organisations/${organisationId}/incidents/${incident!.id}/claim`);
      onClaimed();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not claim this incident.';
      setError(message);
      onClaimError(message);
    } finally {
      setClaiming(false);
    }
  }

  return (
    <Modal
      open={Boolean(incident)}
      onClose={onClose}
      title={incident.title}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button disabled={claiming} onClick={claim}>
            {claiming ? 'Claiming…' : 'Claim Incident'}
          </Button>
        </>
      }
    >
      {error && (
        <div style={{ marginBottom: 12 }}>
          <ErrorBanner message={error} />
        </div>
      )}

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

      <div className="map-placeholder" style={{ height: 140, marginBottom: 8 }}>
        <IconPin style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'var(--rejected)' }} />
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginBottom: 16 }}>
        {incident.latitude.toFixed(5)}, {incident.longitude.toFixed(5)}
        {incident.address && ` — ${incident.address}`}
      </p>

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
