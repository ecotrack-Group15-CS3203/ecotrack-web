'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Chip, UrgencyBadge } from '@/components/ui';
import { thumbGradient } from '@/lib/thumb-gradients';
import { relativeAge } from '@/lib/format';
import { nextStageFor, type Board } from '@/lib/board';
import type { Incident, WorkflowStage } from '@/lib/types';

/** Toggle between the table and the pipeline board. A plain segmented
 * control rather than a shared primitive -- this is its only consumer. */
export function ViewToggle({ view, onChange }: { view: 'list' | 'board'; onChange: (view: 'list' | 'board') => void }) {
  const { t } = useTranslation();
  return (
    <div className="view-toggle" role="group" aria-label={t('incidentsList.view.label')}>
      <button
        type="button"
        className={`view-toggle-btn ${view === 'list' ? 'active' : ''}`}
        aria-pressed={view === 'list'}
        onClick={() => onChange('list')}
      >
        {t('incidentsList.view.list')}
      </button>
      <button
        type="button"
        className={`view-toggle-btn ${view === 'board' ? 'active' : ''}`}
        aria-pressed={view === 'board'}
        onClick={() => onChange('board')}
      >
        {t('incidentsList.view.board')}
      </button>
    </div>
  );
}

export function PipelineBoard({
  board,
  stages,
  onMove,
  movingId,
}: {
  board: Board;
  stages: WorkflowStage[];
  onMove: (incident: Incident, targetStage: WorkflowStage) => void;
  movingId: string | null;
}) {
  return (
    <div className="board">
      {board.columns.map((column) => (
        <BoardColumnView
          key={column.stage.id}
          stage={column.stage}
          incidents={column.incidents}
          stages={stages}
          onMove={onMove}
          movingId={movingId}
        />
      ))}
      {board.unplaced.length > 0 && (
        <BoardColumnView stage={null} incidents={board.unplaced} stages={stages} onMove={onMove} movingId={movingId} />
      )}
    </div>
  );
}

function BoardColumnView({
  stage,
  incidents,
  stages,
  onMove,
  movingId,
}: {
  stage: WorkflowStage | null;
  incidents: Incident[];
  stages: WorkflowStage[];
  onMove: (incident: Incident, targetStage: WorkflowStage) => void;
  movingId: string | null;
}) {
  const { t } = useTranslation();
  return (
    <div className="board-column">
      <div className="board-column-head" style={{ borderTopColor: stage?.color ?? 'var(--border-strong)' }}>
        <span className="board-column-title">{stage ? stage.name : t('incidentsList.board.unplacedColumn')}</span>
        <span className="board-column-count">{incidents.length}</span>
        {stage?.isFinal && (
          <span className="board-column-final" title={t('incidentsList.board.finalStage')} aria-label={t('incidentsList.board.finalStage')}>
            ✓
          </span>
        )}
      </div>
      <div className="board-column-body">
        {incidents.length === 0 ? (
          <div className="board-empty">
            {stage
              ? t('incidentsList.board.emptyColumn', { stage: stage.name })
              : t('incidentsList.board.emptyColumnFallback')}
          </div>
        ) : (
          incidents.map((incident, index) => (
            <BoardCard
              key={incident.id}
              incident={incident}
              index={index}
              stages={stages}
              onMove={onMove}
              busy={movingId === incident.id}
            />
          ))
        )}
      </div>
    </div>
  );
}

function BoardCard({
  incident,
  index,
  stages,
  onMove,
  busy,
}: {
  incident: Incident;
  index: number;
  stages: WorkflowStage[];
  onMove: (incident: Incident, targetStage: WorkflowStage) => void;
  busy: boolean;
}) {
  const { t } = useTranslation();
  const currentStage = incident.currentStageId ? stages.find((s) => s.id === incident.currentStageId) : undefined;
  const next = currentStage ? nextStageFor(currentStage, stages) : null;

  return (
    <div className="board-card" aria-busy={busy}>
      <div className="board-card-band" style={{ background: thumbGradient(index) }} aria-hidden="true" />
      <Link href={`/incidents/${incident.id}`} className="board-card-title">
        {incident.title}
      </Link>
      <div className="board-card-chips">
        <UrgencyBadge severity={incident.severity} />
        <Chip tone="neutral">{incident.category.replace(/_/g, ' ')}</Chip>
        {incident.verificationStatus && incident.verificationStatus !== 'approved' && (
          <Chip tone={incident.verificationStatus}>{incident.verificationStatus}</Chip>
        )}
      </div>
      <div className="board-card-footer">
        <span>{relativeAge(incident.createdAt)}</span>
        {next && (
          <button type="button" className="board-card-advance" disabled={busy} onClick={() => onMove(incident, next)}>
            {busy ? t('incidentsList.board.moving') : t('incidentsList.board.advanceTo', { stage: next.name })}
          </button>
        )}
      </div>
      {/* Available even on a final stage -- the detail page's equivalent
          disables all movement once final, which is a dead end after a
          mis-click. This is the more permissive of the two and should win. */}
      <select
        className="board-card-move"
        aria-label={t('incidentsList.board.moveToLabel', { title: incident.title })}
        value=""
        disabled={busy}
        onChange={(event) => {
          const target = stages.find((s) => s.id === event.target.value);
          if (target) onMove(incident, target);
          event.target.value = '';
        }}
      >
        <option value="" disabled>
          {t('incidentsList.board.moveTo')}
        </option>
        {stages
          .filter((s) => s.id !== incident.currentStageId && s.position > 0)
          .map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
      </select>
    </div>
  );
}
