'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useApiGet, useAuthedFetch } from '@/lib/use-org-api';
import { Button, Card, Chip, DetailHeader, ErrorBanner, FieldError, SectionTitle, Spinner, StatusChip } from '@/components/ui';
import type { Incident, Paginated, WorkflowStage } from '@/lib/types';
import { ApiError, absoluteUrl } from '@/lib/api';
import { useTranslation } from 'react-i18next';
import { useFieldValidation, required } from '@/lib/use-field-validation';
import { LocationMap } from '@/components/incident-map';

type Decision = 'reject' | 'duplicate';

export default function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { t } = useTranslation();
  const { id } = use(params);
  const { activeOrgId } = useAuth();
  const router = useRouter();
  const api = useAuthedFetch();

  const detailPath = activeOrgId ? `/organisations/${activeOrgId}/incidents/${id}` : null;
  const { data: incident, error, mutate } = useApiGet<Incident>(detailPath);
  // limit=100: feeds the "duplicate of" picker below, which needs the full set.
  const allPath = activeOrgId ? `/organisations/${activeOrgId}/incidents?limit=100` : null;
  const { data: allIncidentsPage } = useApiGet<Paginated<Incident>>(allPath);
  const allIncidents = allIncidentsPage?.items;
  const stagesPath = activeOrgId ? `/organisations/${activeOrgId}/workflow-stages` : null;
  const { data: stages } = useApiGet<WorkflowStage[]>(stagesPath);

  const [decision, setDecision] = useState<Decision>('reject');
  const [reason, setReason] = useState('');
  const [duplicateOfId, setDuplicateOfId] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [selectedStageId, setSelectedStageId] = useState('');
  const [stageBusy, setStageBusy] = useState(false);
  const [stageError, setStageError] = useState<string | null>(null);
  const reasonValidation = useFieldValidation(required(t('incidentDetail.verification.reasonRequired')));
  const duplicateValidation = useFieldValidation(required(t('incidentDetail.verification.originalRequired')));

  if (error) {
    return <ErrorBanner message={error instanceof ApiError ? error.message : t('incidentDetail.loadError')} />;
  }
  if (!incident || !activeOrgId) return <Spinner />;

  async function submit() {
    setActionError(null);
    setBusy(true);
    try {
      if (decision === 'reject') {
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

  const decisionLabel = { reject: 'Reject / dismiss incident', duplicate: 'Mark as duplicate' }[decision];

  const orderedStages = (stages ?? []).slice().sort((a, b) => a.position - b.position);
  const stagesById = new Map(orderedStages.map((s) => [s.id, s]));
  const currentStage = incident.currentStageId ? stagesById.get(incident.currentStageId) : undefined;

  async function updateStage() {
    if (!selectedStageId) return;
    setStageError(null);
    setStageBusy(true);
    try {
      await api.patch(`/organisations/${activeOrgId}/incidents/${id}/stage`, { stageId: selectedStageId, expectedVersion: incident!.version });
      await mutate();
    } catch (err) {
      setStageError(err instanceof ApiError ? err.message : 'Could not update status');
    } finally {
      setStageBusy(false);
    }
  }

  return (
    <div>
      <DetailHeader
        backHref="/incidents"
        backLabel={t('incidentDetail.backToIncidents')}
        title={incident.title}
        chips={
          <>
            <Chip tone="neutral">{incident.category.replace(/_/g, ' ')}</Chip>
            <Chip tone={incident.severity}>{`${incident.severity} severity`}</Chip>
            <StatusChip status={incident.verificationStatus ?? 'pending'} />
          </>
        }
      />
      <div className="detail-grid">
      <div>
        {incident.images[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="media-thumb"
            src={absoluteUrl(incident.images[0].url)}
            alt={incident.title}
            style={{ width: '100%', height: 220, borderRadius: 10, objectFit: 'cover', marginBottom: 16 }}
          />
        )}
        {incident.images.length > 1 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {incident.images.slice(1).map((img) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img.id}
                className="media-thumb"
                src={absoluteUrl(img.url)}
                alt={`${incident.title} evidence`}
                style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover' }}
              />
            ))}
          </div>
        )}

        <p style={{ fontSize: 13.5, color: 'var(--text-2)', margin: '10px 0 16px' }}>{incident.description}</p>

        {incident.rejectionReason && (
          <p style={{ fontSize: 13.5, color: 'var(--rejected)', marginBottom: 16 }}>
            Rejection reason: {incident.rejectionReason}
          </p>
        )}

        <SectionTitle>Location</SectionTitle>
        <LocationMap
          id={incident.id}
          title={incident.title}
          latitude={incident.location.lat}
          longitude={incident.location.lng}
          address={incident.address}
        />
        <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 8 }}>
          {incident.location.lat.toFixed(5)}, {incident.location.lng.toFixed(5)}
          {incident.address && ` — ${incident.address}`}
        </p>
      </div>

      {incident.verificationStatus === 'approved' ? (
        <>
        <Card style={{ padding: 20 }}>
          <h3 style={{ fontSize: 17, marginBottom: 14 }}>Actions</h3>

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
              disabled={stageBusy || !selectedStageId || Boolean(currentStage?.isFinal)}
              onClick={updateStage}
            >
              {stageBusy ? 'Updating…' : 'Update status'}
            </Button>
            {currentStage?.isFinal && (
              <p className="hint">This incident is in a final stage and can no longer be moved.</p>
            )}
          </div>

        </Card>

        <Card style={{ padding: 20, marginTop: 16 }}>
          <h3 style={{ fontSize: 17, marginBottom: 14 }}>{t('incidentDetail.verification.title')}</h3>

          {actionError && (
            <div style={{ marginBottom: 12 }}>
              <ErrorBanner message={actionError} />
            </div>
          )}

          <div className="field">
            <span className="field-label">{t('incidentDetail.verification.decision')}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(['reject', 'duplicate'] as Decision[]).map((d) => (
                <label key={d} style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 400, fontSize: 13.5 }}>
                  <input type="radio" name="decision" checked={decision === d} onChange={() => setDecision(d)} />
                  {d === 'reject' ? t('incidentDetail.verification.reject') : t('incidentDetail.verification.markDuplicate')}
                </label>
              ))}
            </div>
          </div>

          {decision === 'reject' && (
            <div className="field">
              <label htmlFor="rejection-reason">{t('incidentDetail.verification.reasonLabel')}</label>
              <textarea id="rejection-reason" aria-invalid={Boolean(reasonValidation.error)} aria-describedby={reasonValidation.error ? 'rejection-reason-error' : undefined} value={reason} onChange={(e) => { setReason(e.target.value); reasonValidation.revalidate(e.target.value); }} onBlur={(e) => reasonValidation.onBlur(e.target.value)} placeholder={t('incidentDetail.verification.reasonPlaceholder')} />
              <FieldError id="rejection-reason-error" message={reasonValidation.error} />
            </div>
          )}

          {decision === 'duplicate' && (
            <div className="field">
              <label htmlFor="duplicate-incident">{t('incidentDetail.verification.originalIncident')}</label>
              <select id="duplicate-incident" aria-invalid={Boolean(duplicateValidation.error)} aria-describedby={duplicateValidation.error ? 'duplicate-incident-error' : undefined} value={duplicateOfId} onChange={(e) => { setDuplicateOfId(e.target.value); duplicateValidation.revalidate(e.target.value); }} onBlur={(e) => duplicateValidation.onBlur(e.target.value)}>
                <option value="">{t('incidentDetail.verification.selectPlaceholder')}</option>
                {(allIncidents ?? [])
                  .filter((i) => i.id !== incident.id)
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.title}
                    </option>
                  ))}
              </select>
              <FieldError id="duplicate-incident-error" message={duplicateValidation.error} />
            </div>
          )}

          <Button variant="destructive" className="btn-block" disabled={busy} onClick={submit}>
            {busy ? 'Submitting…' : decisionLabel}
          </Button>
        </Card>
        </>
      ) : (
        <Card style={{ padding: 20 }}>
          <h3 style={{ fontSize: 17, marginBottom: 8 }}>{t('incidentDetail.verification.title')}</h3>
          <p style={{ color: 'var(--text-2)' }}>
            This incident has already been {incident.verificationStatus}.
          </p>
        </Card>
      )}
      </div>
    </div>
  );
}
