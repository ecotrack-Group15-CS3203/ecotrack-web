'use client';

import Link from 'next/link';
import { Chip, UrgencyBadge } from '@/components/ui';
import { thumbGradient } from '@/lib/thumb-gradients';
import { relativeAge } from '@/lib/format';
import { nextStageFor, type Board } from '@/lib/board';
import type { Incident, WorkflowStage } from '@/lib/types';

/** Toggle between the table and the pipeline board. A plain segmented
 * control rather than a shared primitive -- this is its only consumer. */
export function ViewToggle({ view, onChange }: { view: 'list' | 'board'; onChange: (view: 'list' | 'board') => void }) {
  return (
    <div className="view-toggle" role="group" aria-label="View">
      <button
        type="button"
        className={`view-toggle-btn ${view === 'list' ? 'active' : ''}`}
        aria-pressed={view === 'list'}
        onClick={() => onChange('list')}
      >
        List
      </button>
      <button
        type="button"
        className={`view-toggle-btn ${view === 'board' ? 'active' : ''}`}
        aria-pressed={view === 'board'}
        onClick={() => onChange('board')}
      >
        Board
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
  return (
    <div className="board-column">
      <div className="board-column-head" style={{ borderTopColor: stage?.color ?? 'var(--border-strong)' }}>
        <span className="board-column-title">{stage ? stage.name : 'Needs a stage'}</span>
        <span className="board-column-count">{incidents.length}</span>
        {stage?.isFinal && (
          <span className="board-column-final" title="Final stage" aria-label="Final stage">
            ✓
          </span>
        )}
      </div>
      <div className="board-column-body">
        {incidents.length === 0 ? (
          <div className="board-empty">No incidents in {stage ? stage.name : 'this group'}</div>
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
            {busy ? 'Moving…' : `→ ${next.name}`}
          </button>
        )}
      </div>
      {/* Available even on a final stage -- the detail page's equivalent
          disables all movement once final, which is a dead end after a
          mis-click. This is the more permissive of the two and should win. */}
      <select
        className="board-card-move"
        aria-label={`Move ${incident.title} to a different stage`}
        value=""
        disabled={busy}
        onChange={(event) => {
          const target = stages.find((s) => s.id === event.target.value);
          if (target) onMove(incident, target);
          event.target.value = '';
        }}
      >
        <option value="" disabled>
          Move to…
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
