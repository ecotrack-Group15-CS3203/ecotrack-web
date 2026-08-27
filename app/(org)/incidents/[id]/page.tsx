'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useApiGet, useAuthedFetch } from '@/lib/use-org-api';
import { Button, Card, Chip, ErrorBanner, SectionTitle, Spinner } from '@/components/ui';
import type { Incident, WorkflowStage } from '@/lib/types';
import { ApiError, absoluteUrl } from '@/lib/api';

type Decision = 'approve' | 'reject' | 'duplicate';

export default function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { activeOrgId } = useAuth();
  const router = useRouter();
  const api = useAuthedFetch();

  const detailPath = activeOrgId ? `/organisations/${activeOrgId}/incidents/${id}` : null;
  const { data: incident, error, mutate } = useApiGet<Incident>(detailPath);
  const allPath = activeOrgId ? `/organisations/${activeOrgId}/incidents` : null;
  const { data: allIncidents } = useApiGet<Incident[]>(allPath);
  const stagesPath = activeOrgId ? `/organisations/${activeOrgId}/workflow-stages` : null;
  const { data: stages } = useApiGet<WorkflowStage[]>(stagesPath);

  const [decision, setDecision] = useState<Decision>('approve');
  const [reason, setReason] = useState('');
  const [duplicateOfId, setDuplicateOfId] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [selectedStageId, setSelectedStageId] = useState('');
  const [stageBusy, setStageBusy] = useState(false);
  const [stageError, setStageError] = useState<string | null>(null);
  const [dismissBusy, setDismissBusy] = useState(false);
  const [dismissError, setDismissError] = useState<string | null>(null);

  if (error) {
    return <ErrorBanner message={error instanceof ApiError ? error.message : 'Failed to load incident'} />;
  }
  if (!incident || !activeOrgId) return <Spinner />;

  async function submit() {
    setActionError(null);
    setBusy(true);
    try {
      if (decision === 'approve') {
        await api.patch(`/organisations/${activeOrgId}/incidents/${id}/approve`);
      } else if (decision === 'reject') {
        if (!reason.trim()) throw new ApiError(400, 'A rejection reason is required');
        await api.patch(`/organisations/${activeOrgId}/incidents/${id}/reject`, { reason });
      } else {
        if (!duplicateOfId) throw new ApiError(400, 'Select the original incident');
        await api.patch(`/organisations/${activeOrgId}/incidents/${id}/duplicate`, { duplicateOfId });
      }
      await mutate();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  const decisionLabel = { approve: 'Approve incident', reject: 'Reject incident', duplicate: 'Mark as duplicate' }[decision];

  const orderedStages = (stages ?? []).slice().sort((a, b) => a.position - b.position);

  async function updateStage() {
    if (!selectedStageId) return;
    setStageError(null);
    setStageBusy(true);
    try {
      await api.patch(`/organisations/${activeOrgId}/incidents/${id}/stage`, { stageId: selectedStageId });
      await mutate();
    } catch (err) {
      setStageError(err instanceof ApiError ? err.message : 'Could not update status');
    } finally {
      setStageBusy(false);
    }
  }

  async function dismiss() {
    setDismissError(null);
    setDismissBusy(true);
    try {
      await api.patch(`/organisations/${activeOrgId}/incidents/${id}/reject`, {
        reason: 'Dismissed by organisation admin',
      });
      await mutate();
    } catch (err) {
      setDismissError(err instanceof ApiError ? err.message : 'Could not dismiss incident');
    } finally {
      setDismissBusy(false);
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 22, alignItems: 'start' }}>
      <div>
        <Button variant="text" onClick={() => router.push('/incidents')} style={{ marginBottom: 10 }}>
          ← Back to incidents
        </Button>

        {incident.images[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={absoluteUrl(incident.images[0].url)}
            alt=""
            style={{ width: '100%', height: 220, borderRadius: 10, objectFit: 'cover', marginBottom: 16 }}
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
                style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover' }}
              />
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <Chip tone="neutral">{incident.category.replace(/_/g, ' ')}</Chip>
          <Chip tone={incident.severity}>{`${incident.severity} severity`}</Chip>
          <Chip tone={incident.verificationStatus}>{incident.verificationStatus}</Chip>
        </div>
        <h1 style={{ fontSize: 19 }}>{incident.title}</h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-2)', margin: '10px 0 16px' }}>{incident.description}</p>

        {incident.rejectionReason && (
          <p style={{ fontSize: 13.5, color: 'var(--rejected)', marginBottom: 16 }}>
            Rejection reason: {incident.rejectionReason}
          </p>
        )}

        <SectionTitle>Location</SectionTitle>
        <div className="map-placeholder" />
        <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 8 }}>
          {incident.latitude.toFixed(5)}, {incident.longitude.toFixed(5)}
          {incident.address && ` — ${incident.address}`}
        </p>
      </div>

      {incident.verificationStatus === 'pending' ? (
        <Card style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, marginBottom: 14 }}>Verification</h3>

          {actionError && (
            <div style={{ marginBottom: 12 }}>
              <ErrorBanner message={actionError} />
            </div>
          )}

          <div className="field">
            <label>Decision</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(['approve', 'reject', 'duplicate'] as Decision[]).map((d) => (
                <label key={d} style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 400, fontSize: 13.5 }}>
                  <input type="radio" name="decision" checked={decision === d} onChange={() => setDecision(d)} />
                  {d === 'approve' ? 'Approve' : d === 'reject' ? 'Reject' : 'Mark as duplicate'}
                </label>
              ))}
            </div>
          </div>

          {decision === 'reject' && (
            <div className="field">
              <label>Reason</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this being rejected?" />
            </div>
          )}

          {decision === 'duplicate' && (
            <div className="field">
              <label>Original incident</label>
              <select value={duplicateOfId} onChange={(e) => setDuplicateOfId(e.target.value)}>
                <option value="">Select…</option>
                {(allIncidents ?? [])
                  .filter((i) => i.id !== incident.id)
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.title}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <Button variant={decision === 'reject' ? 'destructive' : 'primary'} className="btn-block" disabled={busy} onClick={submit}>
            {busy ? 'Submitting…' : decisionLabel}
          </Button>
        </Card>
      ) : (
        <Card style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, marginBottom: 8 }}>Verification</h3>
          <p style={{ fontSize: 13.5, color: 'var(--text-2)', marginBottom: 20 }}>
            This incident has already been {incident.verificationStatus}.
          </p>

          {incident.verificationStatus === 'approved' && (
            <>
              <SectionTitle>Actions</SectionTitle>

              <Button className="btn-block" style={{ marginBottom: 8 }} onClick={() => router.push(`/tasks?incidentId=${incident.id}`)}>
                + Create task
              </Button>
              <Button
                variant="secondary"
                className="btn-block"
                style={{ marginBottom: 16 }}
                onClick={() => router.push(`/events?incidentId=${incident.id}`)}
              >
                + Create event
              </Button>

              <div className="field">
                <label>Update status</label>
                {stageError && (
                  <div style={{ marginBottom: 8 }}>
                    <ErrorBanner message={stageError} />
                  </div>
                )}
                <select value={selectedStageId} onChange={(e) => setSelectedStageId(e.target.value)}>
                  <option value="">Select a workflow stage…</option>
                  {orderedStages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                      {stage.id === incident.currentStageId ? ' (current)' : ''}
                    </option>
                  ))}
                </select>
                <Button
                  variant="secondary"
                  className="btn-block"
                  style={{ marginTop: 8 }}
                  disabled={stageBusy || !selectedStageId}
                  onClick={updateStage}
                >
                  {stageBusy ? 'Updating…' : 'Update status'}
                </Button>
              </div>

              {dismissError && (
                <div style={{ marginBottom: 8 }}>
                  <ErrorBanner message={dismissError} />
                </div>
              )}
              <Button
                variant="destructive"
                className="btn-block"
                disabled={dismissBusy || Boolean(incident.currentStage?.isFinal)}
                onClick={dismiss}
              >
                {dismissBusy ? 'Dismissing…' : 'Dismiss incident'}
              </Button>
              {incident.currentStage?.isFinal && (
                <p className="hint">This incident is in a final stage and can no longer be dismissed.</p>
              )}
            </>
          )}
        </Card>
      )}
    </div>
  );
}
