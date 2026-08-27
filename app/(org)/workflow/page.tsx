'use client';

import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useApiGet, useAuthedFetch } from '@/lib/use-org-api';
import type { WorkflowStage, WorkflowStageRuleSettings } from '@/lib/types';
import { Button, Card, ErrorBanner, FieldError, PageHeader, Spinner, Toast } from '@/components/ui';
import { IconDrag, IconTrash } from '@/components/icons';
import { useTranslation } from 'react-i18next';
import { useFieldValidation, required } from '@/lib/use-field-validation';

const DEFAULT_COLOR = '#0F6E56';
const EMPTY_RULES: WorkflowStageRuleSettings = {
  taskCreation: { minimumStageId: null, targetStageId: null },
  eventCreation: { minimumStageId: null, targetStageId: null },
  taskCompletion: { targetStageId: null },
  eventCompletion: { targetStageId: null },
};

const sortStages = (stages: WorkflowStage[]) => stages.slice().sort((a, b) => (a.orderIndex ?? a.position) - (b.orderIndex ?? b.position));
const isReported = (stage: WorkflowStage) => stage.isFixed || stage.slug === 'reported' || stage.name.trim().toLowerCase() === 'reported';
const isColorHex = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value);

export default function WorkflowPage() {
  const { t } = useTranslation();
  const { activeOrgId } = useAuth();
  const api = useAuthedFetch();
  const stagesPath = activeOrgId ? `/v1/workflows/stages?organizationId=${activeOrgId}` : null;
  const rulesPath = activeOrgId ? `/v1/workflows/stage-rules?organizationId=${activeOrgId}` : null;
  const { data: stages, error: stagesError, mutate: mutateStages } = useApiGet<WorkflowStage[]>(stagesPath);
  const { data: savedRules, error: rulesError, mutate: mutateRules } = useApiGet<WorkflowStageRuleSettings>(rulesPath);
  const [newStage, setNewStage] = useState({ name: '', description: '', color: DEFAULT_COLOR });
  const [editing, setEditing] = useState<WorkflowStage | null>(null);
  const [edit, setEdit] = useState({ name: '', description: '', color: DEFAULT_COLOR, isFinal: false });
  const [rules, setRules] = useState<WorkflowStageRuleSettings>(EMPTY_RULES);
  const [dragId, setDragId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const orderedStages = useMemo(() => sortStages(stages ?? []), [stages]);
  const newStageValidation = useFieldValidation(required(t('workflow.addModal.nameRequired')));
  const editStageValidation = useFieldValidation(required(t('workflow.addModal.nameRequired')));

  useEffect(() => {
    if (savedRules) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRules(savedRules);
    }
  }, [savedRules]);

  function showError(error: unknown, fallback: string) {
    setActionError(error instanceof ApiError ? error.message : fallback);
  }

  async function addStage() {
    if (!newStage.name.trim()) return;
    setBusy(true); setActionError(null);
    try {
      await api.post('/v1/workflows/stages', { ...newStage, organizationId: activeOrgId });
      setNewStage({ name: '', description: '', color: DEFAULT_COLOR });
      setToast('Stage added.'); await mutateStages();
    } catch (error) { showError(error, 'Unable to add the stage.'); } finally { setBusy(false); }
  }

  function openEdit(stage: WorkflowStage) {
    setEditing(stage);
    setEdit({ name: stage.name, description: stage.description ?? '', color: stage.color ?? DEFAULT_COLOR, isFinal: stage.isFinal });
  }

  async function saveEdit() {
    if (!editing || !edit.name.trim()) return;
    setBusy(true); setActionError(null);
    try {
      await api.patch(`/v1/workflows/stages/${editing.id}`, edit);
      setEditing(null); setToast('Stage updated.'); await mutateStages();
    } catch (error) { showError(error, 'Unable to update the stage.'); } finally { setBusy(false); }
  }

  async function deleteStage(stage: WorkflowStage) {
    setBusy(true); setActionError(null);
    try {
      await api.del(`/v1/workflows/stages/${stage.id}`);
      setToast('Stage deleted.'); await mutateStages();
    } catch (error) { showError(error, 'Unable to delete the stage.'); } finally { setBusy(false); }
  }

  async function reorder(targetId: string) {
    if (!dragId || dragId === targetId || !stages) return;
    const source = orderedStages.find((stage) => stage.id === dragId);
    const target = orderedStages.find((stage) => stage.id === targetId);
    if (!source || !target || isReported(source) || isReported(target)) return;
    const next = [...orderedStages];
    next.splice(next.findIndex((stage) => stage.id === dragId), 1);
    next.splice(next.findIndex((stage) => stage.id === targetId), 0, source);
    setBusy(true); setActionError(null);
    try {
      await api.patch('/v1/workflows/stages/reorder', { organizationId: activeOrgId, orderedStageIds: next.map((stage) => stage.id) });
      await mutateStages();
    } catch (error) { showError(error, 'Unable to reorder stages.'); } finally { setBusy(false); setDragId(null); }
  }

  async function moveStage(stageId: string, direction: -1 | 1) {
    const index = orderedStages.findIndex((stage) => stage.id === stageId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= orderedStages.length || isReported(orderedStages[index]) || isReported(orderedStages[targetIndex])) return;
    const next = [...orderedStages];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setBusy(true); setActionError(null);
    try { await api.patch('/v1/workflows/stages/reorder', { organizationId: activeOrgId, orderedStageIds: next.map((stage) => stage.id) }); await mutateStages(); }
    catch (error) { showError(error, t('workflow.loadError')); }
    finally { setBusy(false); }
  }

  async function saveRules() {
    setBusy(true); setActionError(null);
    try {
      await api.patch('/v1/workflows/stage-rules', { organizationId: activeOrgId, ...rules });
      setToast('Stage rules saved.'); await mutateRules();
    } catch (error) { showError(error, 'Unable to save stage rules.'); } finally { setBusy(false); }
  }

  const options = (automatic = false) => <>
    <option value="">{automatic ? 'Automatic' : 'Choose a stage'}</option>
    {orderedStages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
  </>;

  if (stagesError) return <ErrorBanner message={stagesError instanceof ApiError ? stagesError.message : t('workflow.loadError')} />;
  if (!stages) return <Spinner />;

  return <div style={{ maxWidth: 860 }}>
    <PageHeader title="Workflow Editor" description="Set the path each report follows from review to completion." />
    {actionError && <div style={{ marginBottom: 16 }}><ErrorBanner message={actionError} /></div>}

    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {orderedStages.map((stage) => {
        const locked = isReported(stage);
        return <Card key={stage.id} style={{ padding: 16, borderLeft: `5px solid ${stage.color ?? DEFAULT_COLOR}`, opacity: busy ? 0.75 : 1 }}>
          <div draggable={!locked && !busy} onDragStart={() => setDragId(stage.id)} onDragOver={(event) => { if (!locked) event.preventDefault(); }} onDrop={() => reorder(stage.id)} onDragEnd={() => setDragId(null)} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {locked ? <span title="This stage is fixed" style={{ color: 'var(--text-3)', fontSize: 16 }}>🔒</span> : <IconDrag className="drag-handle" style={{ width: 18, height: 18, cursor: 'grab' }} />}
            <span aria-hidden style={{ width: 22, height: 22, borderRadius: 5, background: stage.color ?? DEFAULT_COLOR, border: '1px solid rgba(0,0,0,.15)' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><strong>{stage.name}</strong>{locked && <span className="chip chip-neutral">Locked</span>}{stage.isFinal && <span className="chip chip-resolved">Final</span>}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>{stage.slug ?? stage.name.toLowerCase().replace(/\s+/g, '-')}</div>
              {stage.description && <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 5 }}>{stage.description}</div>}
            </div>
            {!locked && <div role="group" aria-label={`${stage.name} controls`} style={{ display: 'flex', gap: 6 }}>
              <Button size="sm" variant="secondary" disabled={busy || orderedStages.findIndex((item) => item.id === stage.id) <= 1} aria-label={t('workflow.moveUp', { name: stage.name })} onClick={() => moveStage(stage.id, -1)}>↑</Button>
              <Button size="sm" variant="secondary" disabled={busy || orderedStages.findIndex((item) => item.id === stage.id) === orderedStages.length - 1} aria-label={t('workflow.moveDown', { name: stage.name })} onClick={() => moveStage(stage.id, 1)}>↓</Button>
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => openEdit(stage)}>{t('workflow.edit')}</Button>
              <button type="button" title={t('workflow.deleteLabel', { name: stage.name })} aria-label={t('workflow.deleteLabel', { name: stage.name })} disabled={busy} onClick={() => deleteStage(stage)} style={{ color: 'var(--text-2)' }}><IconTrash style={{ width: 18, height: 18 }} /></button>
            </div>}
          </div>
        </Card>;
      })}
    </div>

    <Card style={{ marginTop: 16, padding: 18 }}>
      <h2 style={{ fontSize: 16, marginBottom: 14 }}>{t('workflow.addModal.title')}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 210px', gap: 12 }}><div className="field"><label htmlFor="new-stage-name">{t('workflow.addModal.nameLabel')}</label><input id="new-stage-name" aria-invalid={Boolean(newStageValidation.error)} aria-describedby={newStageValidation.error ? 'new-stage-error' : undefined} value={newStage.name} onChange={(event) => { setNewStage({ ...newStage, name: event.target.value }); newStageValidation.revalidate(event.target.value); }} onBlur={(event) => newStageValidation.onBlur(event.target.value)} placeholder="e.g. Awaiting approval" /><FieldError id="new-stage-error" message={newStageValidation.error} /></div><div className="field"><label htmlFor="new-stage-color">{t('workflow.addModal.colorLabel')}</label><div style={{ display: 'flex', gap: 6 }}><input id="new-stage-color" type="color" value={isColorHex(newStage.color) ? newStage.color : DEFAULT_COLOR} onChange={(event) => setNewStage({ ...newStage, color: event.target.value })} style={{ width: 42, height: 42, padding: 3 }} /><input value={newStage.color} onChange={(event) => setNewStage({ ...newStage, color: event.target.value })} aria-label="Colour hex" /></div></div></div>
      <div className="field"><label>Description (optional)</label><textarea value={newStage.description} onChange={(event) => setNewStage({ ...newStage, description: event.target.value })} /></div>
      <Button disabled={busy || !newStage.name.trim() || !isColorHex(newStage.color)} onClick={addStage}>{t('workflow.addModal.submit')}</Button>
    </Card>

    {editing && <Card style={{ marginTop: 16, padding: 18, borderColor: 'var(--primary)' }}>
      <h2 style={{ fontSize: 16, marginBottom: 14 }}>Edit {editing.name}</h2><div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14 }}>Permanent label: {editing.slug ?? editing.name.toLowerCase().replace(/\s+/g, '-')}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 210px', gap: 12 }}><div className="field"><label htmlFor="edit-stage-name">Name</label><input id="edit-stage-name" aria-invalid={Boolean(editStageValidation.error)} aria-describedby={editStageValidation.error ? 'edit-stage-error' : undefined} value={edit.name} onChange={(event) => { setEdit({ ...edit, name: event.target.value }); editStageValidation.revalidate(event.target.value); }} onBlur={(event) => editStageValidation.onBlur(event.target.value)} /><FieldError id="edit-stage-error" message={editStageValidation.error} /></div><div className="field"><label htmlFor="edit-stage-color">Colour</label><div style={{ display: 'flex', gap: 6 }}><input id="edit-stage-color" type="color" value={isColorHex(edit.color) ? edit.color : DEFAULT_COLOR} onChange={(event) => setEdit({ ...edit, color: event.target.value })} style={{ width: 42, height: 42, padding: 3 }} /><input value={edit.color} onChange={(event) => setEdit({ ...edit, color: event.target.value })} aria-label="Colour hex" /></div></div></div>
      <div className="field"><label>Description (optional)</label><textarea value={edit.description} onChange={(event) => setEdit({ ...edit, description: event.target.value })} /></div>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, marginBottom: 16 }}><input type="checkbox" checked={edit.isFinal} onChange={(event) => setEdit({ ...edit, isFinal: event.target.checked })} /> Final stage</label>
      <div style={{ display: 'flex', gap: 8 }}><Button disabled={busy || !edit.name.trim() || !isColorHex(edit.color)} onClick={saveEdit}>Save changes</Button><Button variant="secondary" disabled={busy} onClick={() => setEditing(null)}>Cancel</Button></div>
    </Card>}

    <Card style={{ marginTop: 24, padding: 18 }}>
      <h2 style={{ fontSize: 16, marginBottom: 5 }}>Workflow Stage Rules</h2><p className="subtitle" style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>Choose how creating or completing work changes a report&apos;s stage.</p>
      {rulesError && <div style={{ marginBottom: 12 }}><ErrorBanner message={rulesError instanceof ApiError ? rulesError.message : 'Unable to load stage rules.'} /></div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {([['Task Creation', 'taskCreation', true], ['Event Creation', 'eventCreation', true], ['Task Completion', 'taskCompletion', false], ['Event Completion', 'eventCompletion', false]] as const).map(([label, key, minimum]) => <div key={key} style={{ display: 'grid', gridTemplateColumns: minimum ? '150px 1fr 1fr' : '150px 1fr', gap: 12, alignItems: 'end', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <strong style={{ fontSize: 13 }}>{label}</strong>
          {minimum && <label className="field" style={{ margin: 0 }}><span>Requires incident to have reached</span><select value={rules[key].minimumStageId ?? ''} onChange={(event) => setRules({ ...rules, [key]: { ...rules[key], minimumStageId: event.target.value || null } })}>{options()}</select></label>}
          <label className="field" style={{ margin: 0 }}><span>Moves incident to</span><select value={rules[key].targetStageId ?? ''} onChange={(event) => setRules({ ...rules, [key]: { ...rules[key], targetStageId: event.target.value || null } })}>{options(true)}</select></label>
        </div>)}
      </div>
      <Button style={{ marginTop: 18 }} disabled={busy || !savedRules} onClick={saveRules}>Save rules</Button>
    </Card>
    {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
  </div>;
}
