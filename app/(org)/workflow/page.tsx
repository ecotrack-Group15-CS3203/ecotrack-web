'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useApiGet, useAuthedFetch } from '@/lib/use-org-api';
import { Button, ErrorBanner, PageHeader, Spinner } from '@/components/ui';
import { IconDrag, IconTrash } from '@/components/icons';
import type { WorkflowStage } from '@/lib/types';
import { ApiError } from '@/lib/api';

export default function WorkflowPage() {
  const { activeOrgId } = useAuth();
  const api = useAuthedFetch();
  const path = activeOrgId ? `/organisations/${activeOrgId}/workflow-stages` : null;
  const { data: stages, error, mutate } = useApiGet<WorkflowStage[]>(path);

  const [newStageName, setNewStageName] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  async function toggleFinal(stage: WorkflowStage) {
    setActionError(null);
    setBusy(true);
    try {
      await api.patch(`/organisations/${activeOrgId}/workflow-stages/${stage.id}/final`, { isFinal: !stage.isFinal });
      await mutate();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not update stage');
    } finally {
      setBusy(false);
    }
  }

  async function deleteStage(stage: WorkflowStage) {
    setActionError(null);
    setBusy(true);
    try {
      await api.del(`/organisations/${activeOrgId}/workflow-stages/${stage.id}`);
      await mutate();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not delete stage');
    } finally {
      setBusy(false);
    }
  }

  async function addStage() {
    if (!newStageName.trim()) return;
    setActionError(null);
    setBusy(true);
    try {
      await api.post(`/organisations/${activeOrgId}/workflow-stages`, { name: newStageName });
      setNewStageName('');
      await mutate();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not add stage');
    } finally {
      setBusy(false);
    }
  }

  async function reorder(fromId: string, toId: string) {
    if (!stages || fromId === toId) return;
    const ids = stages.map((s) => s.id);
    const fromIdx = ids.indexOf(fromId);
    const toIdx = ids.indexOf(toId);
    ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, fromId);
    setBusy(true);
    setActionError(null);
    try {
      await api.patch(`/organisations/${activeOrgId}/workflow-stages/reorder`, { orderedStageIds: ids });
      await mutate();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not reorder stages');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <PageHeader title="Workflow configuration" description="Define the stages an incident passes through" />

      {error && <ErrorBanner message={error instanceof ApiError ? error.message : 'Failed to load workflow stages'} />}
      {actionError && (
        <div style={{ marginBottom: 12 }}>
          <ErrorBanner message={actionError} />
        </div>
      )}
      {!stages && !error && <Spinner />}

      {stages &&
        stages.map((stage) => (
          <div
            key={stage.id}
            className={`workflow-row ${stage.isFinal ? 'final' : ''}`}
            draggable
            onDragStart={() => setDragId(stage.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragId) reorder(dragId, stage.id);
              setDragId(null);
            }}
          >
            <IconDrag className="drag-handle" style={{ width: 16, height: 16 }} />
            <b style={{ fontSize: 13.5, flex: 1 }}>{stage.name}</b>
            <span style={{ fontSize: 12, color: stage.isFinal ? 'var(--primary)' : 'var(--text-3)' }}>Final stage</span>
            <button className={`toggle ${stage.isFinal ? 'on' : ''}`} onClick={() => toggleFinal(stage)} disabled={busy} />
            <button
              title="Delete stage"
              style={{ color: 'var(--text-disabled)' }}
              onClick={() => deleteStage(stage)}
              disabled={busy}
            >
              <IconTrash style={{ width: 16, height: 16 }} />
            </button>
          </div>
        ))}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input
          value={newStageName}
          onChange={(e) => setNewStageName(e.target.value)}
          placeholder="New stage name"
          style={{
            flex: 1,
            padding: '11px 12px',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 14,
          }}
        />
        <Button variant="secondary" disabled={busy || !newStageName.trim()} onClick={addStage}>
          + Add stage
        </Button>
      </div>
    </div>
  );
}
