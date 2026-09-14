'use client';

import { useMemo, useState } from 'react';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useApiGet, useAuthedFetch } from '@/lib/use-org-api';
import type { WorkflowStage, WorkflowStageRules } from '@/lib/types';
import { Button, Card, ErrorBanner, FieldError, HelpHint, Modal, PageHeader, Spinner, Toast } from '@/components/ui';
import { IconDrag, IconTrash } from '@/components/icons';
import { useTranslation } from 'react-i18next';
import { useFieldValidation, required } from '@/lib/use-field-validation';

const DEFAULT_COLOR = '#0F6E56';
const sortStages = (stages: WorkflowStage[]) => stages.slice().sort((a, b) => a.position - b.position);
const isReported = (stage: WorkflowStage) => stage.position === 0 || stage.slug === 'reported';
const isColorHex = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value);

type RuleTrigger = 'taskCreation' | 'eventCreation' | 'taskCompletion' | 'eventCompletion';
const RULE_TRIGGERS: RuleTrigger[] = ['taskCreation', 'eventCreation', 'taskCompletion', 'eventCompletion'];
const HAS_MINIMUM: Record<RuleTrigger, boolean> = {
  taskCreation: true,
  eventCreation: true,
  taskCompletion: false,
  eventCompletion: false,
};
const MIN_STAGE_FIELD: Record<RuleTrigger, 'taskCreationMinStageId' | 'eventCreationMinStageId' | null> = {
  taskCreation: 'taskCreationMinStageId',
  eventCreation: 'eventCreationMinStageId',
  taskCompletion: null,
  eventCompletion: null,
};
const TARGET_STAGE_FIELD: Record<RuleTrigger, keyof WorkflowStageRules> = {
  taskCreation: 'taskCreationTargetStageId',
  eventCreation: 'eventCreationTargetStageId',
  taskCompletion: 'taskCompletionTargetStageId',
  eventCompletion: 'eventCompletionTargetStageId',
};

export default function WorkflowPage() {
  const { t } = useTranslation();
  const { activeOrgId } = useAuth();
  const api = useAuthedFetch();
  const stagesPath = activeOrgId ? `/organisations/${activeOrgId}/workflow-stages` : null;
  const { data: stages, error: stagesError, mutate: mutateStages } = useApiGet<WorkflowStage[]>(stagesPath);
  const rulesPath = activeOrgId ? `/organisations/${activeOrgId}/workflow-stage-rules` : null;
  const { data: rules, error: rulesError, mutate: mutateRules } = useApiGet<WorkflowStageRules>(rulesPath);

  const [addOpen, setAddOpen] = useState(false);
  const [newStage, setNewStage] = useState({ name: '', description: '', color: DEFAULT_COLOR });
  const [editing, setEditing] = useState<WorkflowStage | null>(null);
  const [edit, setEdit] = useState({ name: '', description: '', color: DEFAULT_COLOR, isFinal: false });
  const [deleteTarget, setDeleteTarget] = useState<WorkflowStage | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const orderedStages = useMemo(() => sortStages(stages ?? []), [stages]);
  const newStageValidation = useFieldValidation(required(t('workflow.addModal.nameRequired')));
  const editStageValidation = useFieldValidation(required(t('workflow.addModal.nameRequired')));

  function showError(error: unknown, fallback: string) {
    setActionError(error instanceof ApiError ? error.message : fallback);
  }

  async function addStage() {
    if (!newStage.name.trim()) return;
    setBusy(true); setActionError(null);
    try {
      await api.post(`/organisations/${activeOrgId}/workflow-stages`, { ...newStage });
      setNewStage({ name: '', description: '', color: DEFAULT_COLOR });
      setAddOpen(false);
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
      await api.patch(`/organisations/${activeOrgId}/workflow-stages/${editing.id}`, {
        name: edit.name,
        description: edit.description || undefined,
        color: edit.color,
        isFinal: edit.isFinal,
      });
      setEditing(null); setToast('Stage updated.'); await mutateStages();
    } catch (error) { showError(error, 'Unable to update the stage.'); } finally { setBusy(false); }
  }

  async function toggleFinal(stage: WorkflowStage) {
    setBusy(true); setActionError(null);
    try {
      await api.patch(`/organisations/${activeOrgId}/workflow-stages/${stage.id}`, { isFinal: !stage.isFinal });
      await mutateStages();
    } catch (error) { showError(error, 'Unable to update the stage.'); } finally { setBusy(false); }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true); setActionError(null);
    try {
      await api.del(`/organisations/${activeOrgId}/workflow-stages/${deleteTarget.id}`);
      setDeleteTarget(null);
      setToast('Stage deleted.'); await mutateStages();
    } catch (error) { showError(error, 'Unable to delete the stage.'); setDeleteTarget(null); } finally { setBusy(false); }
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
      await api.patch(`/organisations/${activeOrgId}/workflow-stages/reorder`, { orderedStageIds: next.map((stage) => stage.id) });
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
    try { await api.patch(`/organisations/${activeOrgId}/workflow-stages/reorder`, { orderedStageIds: next.map((stage) => stage.id) }); await mutateStages(); }
    catch (error) { showError(error, t('workflow.loadError')); }
    finally { setBusy(false); }
  }

  async function saveRule(trigger: RuleTrigger, field: 'min' | 'target', stageId: string) {
    if (!rules) return;
    const key = field === 'min' ? MIN_STAGE_FIELD[trigger] : TARGET_STAGE_FIELD[trigger];
    if (!key) return;
    setBusy(true); setActionError(null);
    try {
      await api.patch(`/organisations/${activeOrgId}/workflow-stage-rules`, { [key]: stageId || null });
      await mutateRules();
    } catch (error) { showError(error, t('workflow.rulesLoadError')); } finally { setBusy(false); }
  }

  if (stagesError) return <ErrorBanner message={stagesError instanceof ApiError ? stagesError.message : t('workflow.loadError')} />;
  if (!stages) return <Spinner />;

  return <div style={{ maxWidth: 860 }}>
    <PageHeader title={t('workflow.title')} description={t('workflow.description')} action={<Button onClick={() => setAddOpen(true)}>{t('workflow.addStage')}</Button>} />
    {actionError && <div style={{ marginBottom: 16 }}><ErrorBanner message={actionError} /></div>}

    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {orderedStages.map((stage) => {
        const locked = isReported(stage);
        return <Card key={stage.id} style={{ padding: 16, borderLeft: `5px solid ${stage.color ?? DEFAULT_COLOR}`, opacity: busy ? 0.75 : 1 }}>
          <div draggable={!locked && !busy} onDragStart={() => setDragId(stage.id)} onDragOver={(event) => { if (!locked) event.preventDefault(); }} onDrop={() => reorder(stage.id)} onDragEnd={() => setDragId(null)} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {locked ? <span title={t('workflow.lockedHint')} style={{ color: 'var(--text-3)', fontSize: 16 }}>🔒</span> : <IconDrag className="drag-handle" style={{ width: 18, height: 18, cursor: 'grab' }} />}
            <span aria-hidden style={{ width: 22, height: 22, borderRadius: 5, background: stage.color ?? DEFAULT_COLOR, border: '1px solid rgba(0,0,0,.15)' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><strong>{stage.name}</strong>{locked && <span className="chip chip-neutral">{t('workflow.locked')}</span>}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>{stage.slug}</div>
              {stage.description && <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 5 }}>{stage.description}</div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{t('workflow.final')}</span>
              <button
                type="button"
                className={`toggle ${stage.isFinal ? 'on' : ''}`}
                role="switch"
                aria-checked={stage.isFinal}
                aria-label={t('workflow.toggleFinal', { name: stage.name, state: stage.isFinal ? t('workflow.notFinal') : t('workflow.isFinal') })}
                disabled={busy}
                onClick={() => toggleFinal(stage)}
              />
            </div>
            {!locked && <div role="group" aria-label={`${stage.name} controls`} style={{ display: 'flex', gap: 6 }}>
              <Button size="sm" variant="secondary" disabled={busy || orderedStages.findIndex((item) => item.id === stage.id) <= 1} aria-label={t('workflow.moveUp', { name: stage.name })} onClick={() => moveStage(stage.id, -1)}>↑</Button>
              <Button size="sm" variant="secondary" disabled={busy || orderedStages.findIndex((item) => item.id === stage.id) === orderedStages.length - 1} aria-label={t('workflow.moveDown', { name: stage.name })} onClick={() => moveStage(stage.id, 1)}>↓</Button>
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => openEdit(stage)}>{t('workflow.edit')}</Button>
              <button type="button" title={t('workflow.deleteLabel', { name: stage.name })} aria-label={t('workflow.deleteLabel', { name: stage.name })} disabled={busy} onClick={() => setDeleteTarget(stage)} style={{ color: 'var(--text-2)' }}><IconTrash style={{ width: 18, height: 18 }} /></button>
            </div>}
          </div>
        </Card>;
      })}
    </div>

    <RulesPanel
      stages={orderedStages}
      rules={rules}
      rulesError={rulesError}
      busy={busy}
      onSave={saveRule}
      t={t}
    />

    <Modal open={addOpen} onClose={() => setAddOpen(false)} title={t('workflow.addModal.title')} actions={
      <>
        <Button variant="secondary" onClick={() => setAddOpen(false)}>{t('common.cancel')}</Button>
        <Button disabled={busy || !newStage.name.trim() || !isColorHex(newStage.color)} onClick={addStage}>
          {busy ? t('workflow.addModal.adding') : t('workflow.addModal.submit')}
        </Button>
      </>
    }>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 210px', gap: 12 }}>
        <div className="field">
          <label htmlFor="new-stage-name">{t('workflow.addModal.nameLabel')}</label>
          <input id="new-stage-name" aria-invalid={Boolean(newStageValidation.error)} aria-describedby={newStageValidation.error ? 'new-stage-error' : undefined} value={newStage.name} onChange={(event) => { setNewStage({ ...newStage, name: event.target.value }); newStageValidation.revalidate(event.target.value); }} onBlur={(event) => newStageValidation.onBlur(event.target.value)} placeholder="e.g. Awaiting approval" />
          <FieldError id="new-stage-error" message={newStageValidation.error} />
        </div>
        <div className="field">
          <label htmlFor="new-stage-color">
            {t('workflow.addModal.colorLabel')}
            <HelpHint text={t('workflow.addModal.colorHint')} />
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input id="new-stage-color" type="color" value={isColorHex(newStage.color) ? newStage.color : DEFAULT_COLOR} onChange={(event) => setNewStage({ ...newStage, color: event.target.value })} style={{ width: 42, height: 42, padding: 3 }} />
            <input value={newStage.color} onChange={(event) => setNewStage({ ...newStage, color: event.target.value })} aria-label="Colour hex" />
          </div>
        </div>
      </div>
      <div className="field"><label>{t('workflow.addModal.descriptionLabel')}</label><textarea value={newStage.description} onChange={(event) => setNewStage({ ...newStage, description: event.target.value })} /></div>
    </Modal>

    <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={t('workflow.editModal.title')} actions={
      <>
        <Button variant="secondary" disabled={busy} onClick={() => setEditing(null)}>{t('common.cancel')}</Button>
        <Button disabled={busy || !edit.name.trim() || !isColorHex(edit.color)} onClick={saveEdit}>
          {busy ? t('workflow.editModal.savingChanges') : t('workflow.editModal.submit')}
        </Button>
      </>
    }>
      {editing && <>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14 }}>
          {t('workflow.editModal.slugLabel')}: {editing.slug}
          <div className="hint">{t('workflow.editModal.slugHint')}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 210px', gap: 12 }}>
          <div className="field">
            <label htmlFor="edit-stage-name">{t('workflow.addModal.nameLabel')}</label>
            <input id="edit-stage-name" aria-invalid={Boolean(editStageValidation.error)} aria-describedby={editStageValidation.error ? 'edit-stage-error' : undefined} value={edit.name} onChange={(event) => { setEdit({ ...edit, name: event.target.value }); editStageValidation.revalidate(event.target.value); }} onBlur={(event) => editStageValidation.onBlur(event.target.value)} />
            <FieldError id="edit-stage-error" message={editStageValidation.error} />
          </div>
          <div className="field">
            <label htmlFor="edit-stage-color">
              {t('workflow.addModal.colorLabel')}
              <HelpHint text={t('workflow.addModal.colorHint')} />
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input id="edit-stage-color" type="color" value={isColorHex(edit.color) ? edit.color : DEFAULT_COLOR} onChange={(event) => setEdit({ ...edit, color: event.target.value })} style={{ width: 42, height: 42, padding: 3 }} />
              <input value={edit.color} onChange={(event) => setEdit({ ...edit, color: event.target.value })} aria-label="Colour hex" />
            </div>
          </div>
        </div>
        <div className="field"><label>{t('workflow.addModal.descriptionLabel')}</label><textarea value={edit.description} onChange={(event) => setEdit({ ...edit, description: event.target.value })} /></div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, marginBottom: 4 }}>
          <input type="checkbox" checked={edit.isFinal} onChange={(event) => setEdit({ ...edit, isFinal: event.target.checked })} /> {t('workflow.final')}
        </label>
      </>}
    </Modal>

    <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title={t('workflow.delete')} actions={
      <>
        <Button variant="secondary" disabled={busy} onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</Button>
        <Button variant="destructive" disabled={busy} onClick={confirmDelete}>{t('workflow.delete')}</Button>
      </>
    }>
      {deleteTarget && <p style={{ fontSize: 14 }}>{t('workflow.deleteConfirm', { name: deleteTarget.name })}</p>}
    </Modal>

    {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
  </div>;
}

function RulesPanel({
  stages,
  rules,
  rulesError,
  busy,
  onSave,
  t,
}: {
  stages: WorkflowStage[];
  rules: WorkflowStageRules | undefined;
  rulesError: unknown;
  busy: boolean;
  onSave: (trigger: RuleTrigger, field: 'min' | 'target', stageId: string) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  if (rulesError) {
    return (
      <Card style={{ marginTop: 24, padding: 18 }}>
        <ErrorBanner message={rulesError instanceof ApiError ? rulesError.message : t('workflow.rulesLoadError')} />
      </Card>
    );
  }
  if (!rules) return <Card style={{ marginTop: 24, padding: 18 }}><Spinner /></Card>;

  return (
    <Card style={{ marginTop: 24, padding: 18 }}>
      <h2 style={{ fontSize: 16, marginBottom: 14 }}>{t('workflow.rulesTitle')}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {RULE_TRIGGERS.map((trigger) => {
          const minField = MIN_STAGE_FIELD[trigger];
          const targetField = TARGET_STAGE_FIELD[trigger];
          const minValue = minField ? (rules[minField] as string | null) ?? '' : '';
          const targetValue = (rules[targetField] as string | null) ?? '';
          return (
            <div key={trigger} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <strong style={{ fontSize: 13.5 }}>{t(`workflow.rules.${trigger}.label`)}</strong>
                <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0' }}>{t(`workflow.rules.${trigger}.hint`)}</p>
              </div>
              {HAS_MINIMUM[trigger] && (
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>{t('workflow.rules.minimumLabel')}</label>
                  <select disabled={busy} value={minValue} onChange={(e) => onSave(trigger, 'min', e.target.value)}>
                    <option value="">{t('workflow.rules.anyStage')}</option>
                    {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              <div className="field" style={{ marginBottom: 0, gridColumn: HAS_MINIMUM[trigger] ? undefined : '1 / -1' }}>
                <label>{t('workflow.rules.targetLabel')}</label>
                <select disabled={busy} value={targetValue} onChange={(e) => onSave(trigger, 'target', e.target.value)}>
                  <option value="">{t('workflow.rules.automatic')}</option>
                  {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
