import type { EventSummary, IncidentSummary, PoolIncident, Task, WorkflowStage } from './types';
import { earliestPostClaimPosition } from './board';

export type AttentionKind = 'unclaimed' | 'joinRequests' | 'taskOverdue' | 'eventSoon' | 'incidentStalled';

export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  severity: 'high' | 'medium';
  title: string;
  detail: string;
  href: string;
  /** now - referenceTimestamp. Positive means overdue/stale (bigger = more
   * urgent); negative means still upcoming (closer to zero = more urgent).
   * A single "sort by ageMs descending" rule handles both directions, and an
   * overdue item at any age always outranks an upcoming one at the same
   * severity, since a positive number is always greater than a negative one. */
  ageMs: number;
}

export interface NeedsAttentionInput {
  pool?: readonly PoolIncident[];
  pendingJoinRequests?: number;
  tasks?: readonly Task[];
  events?: readonly EventSummary[];
  incidents?: readonly IncidentSummary[];
  stages?: readonly WorkflowStage[];
}

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const MAX_ITEMS = 6;

function daysBetween(ms: number): number {
  return Math.floor(Math.abs(ms) / DAY_MS);
}

/** Ranks every real signal this org's data actually supports into one list:
 * unclaimed reports going stale, pending join requests, overdue tasks,
 * events starting soon, and incidents stuck at their first post-claim stage.
 * `now` is a parameter rather than `Date.now()` read internally, so the
 * ranking is testable without clock flake -- the whole reason this is a
 * `lib/` function and not a `useMemo`. */
export function buildNeedsAttention(input: NeedsAttentionInput, now: number = Date.now()): AttentionItem[] {
  const items: AttentionItem[] = [];

  // Unclaimed pool reports older than 48h, oldest (most stale) first, top 3.
  const unclaimed = (input.pool ?? [])
    .map((incident) => ({ incident, ageMs: now - new Date(incident.createdAt).getTime() }))
    .filter(({ ageMs }) => ageMs > 48 * HOUR_MS)
    .sort((a, b) => b.ageMs - a.ageMs)
    .slice(0, 3);
  for (const { incident, ageMs } of unclaimed) {
    items.push({
      id: `unclaimed-${incident.id}`,
      kind: 'unclaimed',
      severity: 'high',
      title: incident.title,
      detail: `Unclaimed for ${daysBetween(ageMs)}d · ${(incident.distanceMeters / 1000).toFixed(1)} km away`,
      href: '/incident-pool',
      ageMs,
    });
  }

  // Pending join requests: one aggregate row, not one per request.
  const pendingJoinRequests = input.pendingJoinRequests ?? 0;
  if (pendingJoinRequests > 0) {
    items.push({
      id: 'join-requests',
      kind: 'joinRequests',
      severity: 'medium',
      title: `${pendingJoinRequests} ${pendingJoinRequests === 1 ? 'person' : 'people'} waiting to join`,
      detail: 'Review and approve or reject',
      href: '/join-requests',
      ageMs: 0,
    });
  }

  // Overdue tasks: not completed and past due, most overdue first, top 3. A
  // completed task is never overdue regardless of dueDate -- it's filtered
  // out before the date check even runs.
  const overdueTasks = (input.tasks ?? [])
    .filter((task) => task.status !== 'completed')
    .map((task) => ({ task, ageMs: now - new Date(task.dueDate).getTime() }))
    .filter(({ ageMs }) => ageMs > 0)
    .sort((a, b) => b.ageMs - a.ageMs)
    .slice(0, 3);
  for (const { task, ageMs } of overdueTasks) {
    const assignee = task.assignments.find((a) => a.status === 'assigned' || a.status === 'accepted')?.volunteer;
    items.push({
      id: `task-${task.id}`,
      kind: 'taskOverdue',
      severity: 'high',
      title: task.title,
      detail: `Overdue by ${daysBetween(ageMs)}d · assigned to ${assignee?.fullName ?? 'nobody yet'}`,
      href: `/tasks/${task.id}`,
      ageMs,
    });
  }

  // Scheduled events starting within 72h, soonest first, top 2.
  const eventsSoon = (input.events ?? [])
    .filter((event) => event.status === 'scheduled')
    .map((event) => ({ event, ageMs: now - new Date(event.scheduledAt).getTime() }))
    .filter(({ ageMs }) => ageMs < 0 && ageMs > -72 * HOUR_MS)
    .sort((a, b) => b.ageMs - a.ageMs)
    .slice(0, 2);
  for (const { event, ageMs } of eventsSoon) {
    const capacity = event.maxAttendees
      ? `${event.rsvpCount} of ${event.maxAttendees} spots filled`
      : `${event.rsvpCount} RSVP${event.rsvpCount === 1 ? '' : 's'}, unlimited capacity`;
    items.push({
      id: `event-${event.id}`,
      kind: 'eventSoon',
      severity: 'medium',
      title: event.title,
      detail: `Starts in ${daysBetween(ageMs)}d · ${capacity}`,
      href: `/events/${event.id}`,
      ageMs,
    });
  }

  // Claimed incidents still sitting at the earliest post-claim stage for
  // more than 7 days -- claimed but not yet actioned.
  const earliestPosition = earliestPostClaimPosition(input.stages ?? []);
  if (earliestPosition !== null) {
    const stagesById = new Map((input.stages ?? []).map((stage) => [stage.id, stage]));
    const stalled = (input.incidents ?? [])
      .filter((incident) => {
        if (!incident.claimedAt || !incident.currentStageId) return false;
        return stagesById.get(incident.currentStageId)?.position === earliestPosition;
      })
      .map((incident) => ({ incident, ageMs: now - new Date(incident.claimedAt as string).getTime() }))
      .filter(({ ageMs }) => ageMs > 7 * DAY_MS)
      .sort((a, b) => b.ageMs - a.ageMs)
      .slice(0, 3);
    for (const { incident, ageMs } of stalled) {
      const stageName = stagesById.get(incident.currentStageId as string)?.name ?? 'this stage';
      items.push({
        id: `stalled-${incident.id}`,
        kind: 'incidentStalled',
        severity: 'medium',
        title: incident.title,
        detail: `Claimed ${daysBetween(ageMs)}d ago · still at ${stageName}`,
        href: `/incidents/${incident.id}`,
        ageMs,
      });
    }
  }

  // Stable sort: severity first, then most urgent (largest ageMs) within it.
  // Ties keep insertion order, which is itself a deterministic ranking.
  return items
    .sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === 'high' ? -1 : 1;
      return b.ageMs - a.ageMs;
    })
    .slice(0, MAX_ITEMS);
}
