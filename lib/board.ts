import type { Incident, WorkflowStage } from './types';
import { isReported, sortStages } from './workflow-helpers';

export interface BoardColumn {
  stage: WorkflowStage;
  incidents: Incident[];
}

export interface Board {
  columns: BoardColumn[];
  /** Incidents whose currentStageId matches no known stage -- a stage deleted
   * in another tab, say. Kept visible rather than silently dropped. */
  unplaced: Incident[];
}

function byOldestFirst(a: Incident, b: Incident): number {
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

/** Groups incidents into board columns, one per non-"reported" workflow
 * stage. Position 0 (the seeded "reported" stage) is excluded: no incident's
 * currentStageId ever points there, so it would always render as an empty
 * column. Bucketing is a single pass so an incident matching no known stage
 * is caught explicitly, rather than silently vanishing from a naive
 * per-column filter. Within a column, oldest first -- oldest is most at risk
 * of stalling, which is the point of a board. */
export function buildBoard(incidents: readonly Incident[], stages: readonly WorkflowStage[]): Board {
  const orderedStages = sortStages(stages.slice()).filter((stage) => !isReported(stage));
  const byStageId = new Map<string, Incident[]>(orderedStages.map((stage) => [stage.id, []]));
  const unplaced: Incident[] = [];

  for (const incident of incidents) {
    const bucket = incident.currentStageId ? byStageId.get(incident.currentStageId) : undefined;
    if (bucket) bucket.push(incident);
    else unplaced.push(incident);
  }

  const columns: BoardColumn[] = orderedStages.map((stage) => ({
    stage,
    incidents: (byStageId.get(stage.id) ?? []).sort(byOldestFirst),
  }));

  return { columns, unplaced: unplaced.sort(byOldestFirst) };
}

/** The next stage by position after `current`, skipping the reported stage.
 * null when `current` is final (isFinal is the flag that decides this, not
 * position -- final stages are org-configurable and needn't be last) or
 * there simply is no later stage. */
export function nextStageFor(current: WorkflowStage, stages: readonly WorkflowStage[]): WorkflowStage | null {
  if (current.isFinal) return null;
  const ordered = sortStages(stages.slice()).filter((stage) => !isReported(stage));
  const index = ordered.findIndex((stage) => stage.id === current.id);
  if (index === -1 || index === ordered.length - 1) return null;
  return ordered[index + 1];
}

export function canAdvance(stage: WorkflowStage): boolean {
  return !stage.isFinal;
}

/** The position of the stage an incident lands at immediately after being
 * claimed -- the lowest position greater than 0. Shared by the dashboard's
 * cleanup-progress split and the needs-attention "stalled" rule, both of
 * which treat an incident still sitting there as not yet actioned. null when
 * there are no non-reported stages at all. */
export function earliestPostClaimPosition(stages: readonly WorkflowStage[]): number | null {
  const positions = stages.map((stage) => stage.position).filter((position) => position > 0);
  return positions.length > 0 ? Math.min(...positions) : null;
}
