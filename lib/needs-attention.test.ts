import { describe, expect, it } from 'vitest';
import { buildNeedsAttention } from './needs-attention';
import type { EventSummary, IncidentSummary, PoolIncident, Task, WorkflowStage } from './types';

const NOW = new Date('2026-09-18T12:00:00.000Z').getTime();
const DAY = 86_400_000;
const HOUR = 3_600_000;

function iso(msAgo: number): string {
  return new Date(NOW - msAgo).toISOString();
}

function isoIn(msFromNow: number): string {
  return new Date(NOW + msFromNow).toISOString();
}

const stages: WorkflowStage[] = [
  { id: 'reported', name: 'Reported', slug: 'reported', color: '#999', position: 0, isFinal: false } as WorkflowStage,
  { id: 'claimed', name: 'Claimed', slug: 'claimed', color: '#06c', position: 1, isFinal: false } as WorkflowStage,
  { id: 'done', name: 'Done', slug: 'done', color: '#0a0', position: 2, isFinal: true } as WorkflowStage,
];

function poolIncident(overrides: Partial<PoolIncident>): PoolIncident {
  return {
    id: 'p1',
    title: 'Beach litter',
    createdAt: iso(0),
    distanceMeters: 2400,
    ...overrides,
  } as PoolIncident;
}

function task(overrides: Partial<Task>): Task {
  return {
    id: 't1',
    title: 'Clear debris',
    status: 'assigned',
    dueDate: iso(0),
    assignments: [],
    ...overrides,
  } as Task;
}

function event(overrides: Partial<EventSummary>): EventSummary {
  return {
    id: 'e1',
    title: 'Beach cleanup',
    status: 'scheduled',
    scheduledAt: isoIn(0),
    rsvpCount: 6,
    maxAttendees: 20,
    ...overrides,
  } as EventSummary;
}

function incident(overrides: Partial<IncidentSummary>): IncidentSummary {
  return {
    id: 'i1',
    title: 'Oil spill',
    claimedAt: iso(0),
    currentStageId: 'claimed',
    ...overrides,
  } as IncidentSummary;
}

describe('buildNeedsAttention', () => {
  it('returns an empty list when every input is empty', () => {
    expect(buildNeedsAttention({}, NOW)).toEqual([]);
  });

  it('excludes pool items at exactly 48h and includes anything older', () => {
    const atBoundary = poolIncident({ id: 'boundary', createdAt: iso(48 * HOUR) });
    const justOver = poolIncident({ id: 'over', createdAt: iso(48 * HOUR + 1) });
    const items = buildNeedsAttention({ pool: [atBoundary, justOver] }, NOW);
    const ids = items.map((i) => i.id);
    expect(ids).not.toContain('unclaimed-boundary');
    expect(ids).toContain('unclaimed-over');
  });

  it('caps unclaimed at 3, oldest first', () => {
    const pool = [0, 1, 2, 3, 4].map((n) =>
      poolIncident({ id: `p${n}`, createdAt: iso(72 * HOUR + n * HOUR) }),
    );
    const items = buildNeedsAttention({ pool }, NOW).filter((i) => i.kind === 'unclaimed');
    expect(items).toHaveLength(3);
    expect(items.map((i) => i.id)).toEqual(['unclaimed-p4', 'unclaimed-p3', 'unclaimed-p2']);
  });

  it('emits a single aggregate row for pending join requests, with correct pluralisation', () => {
    const singular = buildNeedsAttention({ pendingJoinRequests: 1 }, NOW);
    expect(singular).toHaveLength(1);
    expect(singular[0].title).toBe('1 person waiting to join');

    const plural = buildNeedsAttention({ pendingJoinRequests: 3 }, NOW);
    expect(plural[0].title).toBe('3 people waiting to join');

    expect(buildNeedsAttention({ pendingJoinRequests: 0 }, NOW)).toEqual([]);
  });

  it('counts overdue-by-one-second as overdue', () => {
    const barely = task({ id: 'barely', dueDate: iso(1000) });
    const items = buildNeedsAttention({ tasks: [barely] }, NOW);
    expect(items.map((i) => i.id)).toContain('task-barely');
  });

  it('never treats a completed task as overdue regardless of dueDate', () => {
    const t = task({ id: 'done-task', status: 'completed', dueDate: iso(30 * DAY) });
    expect(buildNeedsAttention({ tasks: [t] }, NOW)).toEqual([]);
  });

  it('names the assigned volunteer, or "nobody yet" when unassigned', () => {
    const assigned = task({
      id: 'a1',
      dueDate: iso(DAY),
      assignments: [{ status: 'accepted', volunteer: { id: 'v1', fullName: 'Ada Lovelace', email: 'a@x.com' } }] as Task['assignments'],
    });
    const unassigned = task({ id: 'a2', dueDate: iso(DAY), assignments: [] });
    const items = buildNeedsAttention({ tasks: [assigned, unassigned] }, NOW);
    expect(items.find((i) => i.id === 'task-a1')?.detail).toContain('Ada Lovelace');
    expect(items.find((i) => i.id === 'task-a2')?.detail).toContain('nobody yet');
  });

  it('includes scheduled events starting within 72h and excludes ones further out or already started', () => {
    const soon = event({ id: 'soon', scheduledAt: isoIn(24 * HOUR) });
    const tooFar = event({ id: 'far', scheduledAt: isoIn(96 * HOUR) });
    const started = event({ id: 'started', scheduledAt: iso(HOUR) });
    const cancelled = event({ id: 'cancelled', status: 'cancelled', scheduledAt: isoIn(HOUR) });
    const items = buildNeedsAttention({ events: [soon, tooFar, started, cancelled] }, NOW);
    const ids = items.map((i) => i.id);
    expect(ids).toContain('event-soon');
    expect(ids).not.toContain('event-far');
    expect(ids).not.toContain('event-started');
    expect(ids).not.toContain('event-cancelled');
  });

  it('describes unlimited-capacity events without a spots-filled fraction', () => {
    const unlimited = event({ id: 'u1', scheduledAt: isoIn(HOUR), maxAttendees: null, rsvpCount: 4 });
    const items = buildNeedsAttention({ events: [unlimited] }, NOW);
    expect(items[0].detail).toContain('unlimited capacity');
  });

  it('flags incidents stalled at the earliest post-claim stage for more than 7 days', () => {
    const stalled = incident({ id: 's1', claimedAt: iso(8 * DAY), currentStageId: 'claimed' });
    const fresh = incident({ id: 's2', claimedAt: iso(2 * DAY), currentStageId: 'claimed' });
    const advanced = incident({ id: 's3', claimedAt: iso(30 * DAY), currentStageId: 'done' });
    const items = buildNeedsAttention({ incidents: [stalled, fresh, advanced], stages }, NOW);
    const ids = items.map((i) => i.id);
    expect(ids).toContain('stalled-s1');
    expect(ids).not.toContain('stalled-s2');
    expect(ids).not.toContain('stalled-s3');
  });

  it('does not compute a stalled column when no stage has a position above 0', () => {
    const flatStages: WorkflowStage[] = [{ id: 'only', name: 'Only', slug: 'only', color: '#000', position: 0, isFinal: false } as WorkflowStage];
    const inc = incident({ id: 's1', claimedAt: iso(30 * DAY), currentStageId: 'only' });
    expect(buildNeedsAttention({ incidents: [inc], stages: flatStages }, NOW)).toEqual([]);
  });

  it('sorts high severity before medium, and by descending age within a severity, with stable ties', () => {
    const oldUnclaimed = poolIncident({ id: 'old', createdAt: iso(10 * DAY) });
    const newerUnclaimed = poolIncident({ id: 'newer', createdAt: iso(3 * DAY) });
    const items = buildNeedsAttention(
      { pool: [newerUnclaimed, oldUnclaimed], pendingJoinRequests: 5 },
      NOW,
    );
    expect(items.map((i) => i.id)).toEqual(['unclaimed-old', 'unclaimed-newer', 'join-requests']);
  });

  it('keeps insertion order for equal severity and equal age', () => {
    const sameAge = iso(10 * DAY);
    const a = poolIncident({ id: 'a', createdAt: sameAge });
    const b = poolIncident({ id: 'b', createdAt: sameAge });
    const items = buildNeedsAttention({ pool: [a, b] }, NOW);
    expect(items.map((i) => i.id)).toEqual(['unclaimed-a', 'unclaimed-b']);
  });

  it('caps the combined result at 6 items', () => {
    const pool = [0, 1, 2].map((n) => poolIncident({ id: `p${n}`, createdAt: iso(72 * HOUR + n * HOUR) }));
    const tasks = [0, 1, 2].map((n) => task({ id: `t${n}`, dueDate: iso(DAY + n * HOUR) }));
    const events = [event({ id: 'e0', scheduledAt: isoIn(HOUR) }), event({ id: 'e1', scheduledAt: isoIn(2 * HOUR) })];
    const items = buildNeedsAttention({ pool, tasks, events, pendingJoinRequests: 2 }, NOW);
    expect(items).toHaveLength(6);
  });

  it('uses the injected now rather than the real clock', () => {
    const inc = poolIncident({ id: 'x', createdAt: new Date(NOW - 49 * HOUR).toISOString() });
    const atRealNow = buildNeedsAttention({ pool: [inc] });
    const atFixedNow = buildNeedsAttention({ pool: [inc] }, NOW);
    expect(atFixedNow.map((i) => i.id)).toContain('unclaimed-x');
    expect(atRealNow).not.toEqual(undefined);
  });
});
