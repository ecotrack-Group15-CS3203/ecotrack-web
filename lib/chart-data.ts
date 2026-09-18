import type { IncidentCategory, IncidentSeverity, WorkflowStage } from './types';

export interface Datum {
  label: string;
  value: number;
  color: string;
}

export interface Arc extends Datum {
  dashArray: string;
  dashOffset: number;
}

const FALLBACK_COLOR = 'var(--text-3)';

const CATEGORY_COLORS: Record<IncidentCategory, string> = {
  illegal_dumping: 'var(--sev-high)',
  water_pollution: 'var(--verified)',
  air_pollution: 'var(--progress)',
  deforestation: 'var(--sev-low)',
  wildlife_hazard: 'var(--sev-med)',
  other: FALLBACK_COLOR,
};

export function categoryLabel(category: string): string {
  return category.replace(/_/g, ' ');
}

/** An unrecognised category (the API's enum can grow) falls back to a
 * defined neutral colour rather than an undefined one, which would render as
 * transparent/black depending on context. */
export function toCategorySeries(byCategory: readonly { category: string; count: number }[]): Datum[] {
  return byCategory
    .filter((c) => c.count > 0)
    .map((c) => ({
      label: categoryLabel(c.category),
      value: c.count,
      color: CATEGORY_COLORS[c.category as IncidentCategory] ?? FALLBACK_COLOR,
    }));
}

/** Grouped by current workflow stage, in stage position order. Stages with no
 * incidents are omitted -- a bar chart has no use for a zero-height bar,
 * unlike the board's empty columns, which are the point there. */
export function toStageSeries(
  incidents: readonly { currentStageId: string | null }[],
  stages: readonly WorkflowStage[],
): Datum[] {
  const counts = new Map<string, number>();
  for (const incident of incidents) {
    if (!incident.currentStageId) continue;
    counts.set(incident.currentStageId, (counts.get(incident.currentStageId) ?? 0) + 1);
  }
  return stages
    .filter((stage) => (counts.get(stage.id) ?? 0) > 0)
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((stage) => ({ label: stage.name, value: counts.get(stage.id) ?? 0, color: stage.color }));
}

const SEVERITY_ORDER: IncidentSeverity[] = ['critical', 'high', 'medium', 'low'];
const SEVERITY_COLORS: Record<IncidentSeverity, string> = {
  critical: 'var(--urgency-critical)',
  high: 'var(--urgency-high)',
  medium: 'var(--urgency-medium)',
  low: 'var(--urgency-low)',
};

export function toSeveritySeries(incidents: readonly { severity: IncidentSeverity }[]): Datum[] {
  const counts = new Map<IncidentSeverity, number>();
  for (const incident of incidents) counts.set(incident.severity, (counts.get(incident.severity) ?? 0) + 1);
  return SEVERITY_ORDER.filter((severity) => (counts.get(severity) ?? 0) > 0).map((severity) => ({
    label: severity[0].toUpperCase() + severity.slice(1),
    value: counts.get(severity) ?? 0,
    color: SEVERITY_COLORS[severity],
  }));
}

const TASK_STATUS_LABELS: Record<string, string> = {
  pending: 'Scheduled',
  in_progress: 'In progress',
  completed: 'Completed',
};
const TASK_STATUS_COLORS: Record<string, string> = {
  pending: 'var(--pending)',
  in_progress: 'var(--progress)',
  completed: 'var(--resolved)',
};

export function toTaskStatusSeries(tasks: readonly { status: string }[]): Datum[] {
  const counts = new Map<string, number>();
  for (const task of tasks) counts.set(task.status, (counts.get(task.status) ?? 0) + 1);
  return Object.keys(TASK_STATUS_LABELS)
    .filter((status) => (counts.get(status) ?? 0) > 0)
    .map((status) => ({ label: TASK_STATUS_LABELS[status], value: counts.get(status) ?? 0, color: TASK_STATUS_COLORS[status] }));
}

/** `resolvedIncidents` counts any isFinal stage, which includes the seeded
 * "Dismissed" stage -- the label says so rather than calling it "Resolved",
 * which would be a factual error. Negative "open" (a stats inconsistency)
 * clamps to zero rather than rendering a negative arc. */
export function toClosureSeries(totalIncidents: number, resolvedIncidents: number): Datum[] {
  const open = Math.max(0, totalIncidents - resolvedIncidents);
  return [
    { label: 'Closed (resolved or dismissed)', value: resolvedIncidents, color: 'var(--resolved)' },
    { label: 'Open', value: open, color: 'var(--border-strong)' },
  ];
}

/** SVG stroke-dasharray/-dashoffset for a donut built from concentric-circle
 * arcs, rotated -90deg by the caller so the first segment starts at 12
 * o'clock. Returns [] when the total is 0 or negative -- the caller renders
 * a plain background ring in that case rather than dividing by zero. Zero-
 * and negative-value segments are dropped, since a 0-length arc is
 * indistinguishable from absent and a negative one is meaningless. */
export function donutArcs(data: readonly Datum[], radius: number): Arc[] {
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((sum, d) => sum + Math.max(0, d.value), 0);
  if (total <= 0) return [];

  let offset = 0;
  return data
    .filter((d) => d.value > 0)
    .map((d) => {
      const length = (d.value / total) * circumference;
      const arc: Arc = { ...d, dashArray: `${length} ${Math.max(0, circumference - length)}`, dashOffset: -offset };
      offset += length;
      return arc;
    });
}
