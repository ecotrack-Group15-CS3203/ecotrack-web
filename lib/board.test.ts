import { describe, expect, it } from 'vitest';
import { buildBoard, canAdvance, earliestPostClaimPosition, nextStageFor } from './board';
import type { Incident, WorkflowStage } from './types';

function stage(overrides: Partial<WorkflowStage> = {}): WorkflowStage {
  return {
    id: 's1',
    createdAt: '',
    updatedAt: '',
    organisationId: 'org1',
    name: 'Claimed',
    slug: 'claimed',
    description: null,
    color: '#0F6E56',
    position: 1,
    isFinal: false,
    ...overrides,
  };
}

function incident(overrides: Partial<Incident> = {}): Incident {
  return {
    id: 'i1',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
    organisationId: 'org1',
    reportedByUserId: null,
    title: 'River bank litter',
    description: '',
    category: 'illegal_dumping',
    severity: 'medium',
    location: { lat: 0, lng: 0 },
    address: null,
    verificationStatus: 'approved',
    currentStageId: 's1',
    rejectionReason: null,
    duplicateOfId: null,
    claimedByUserId: 'u1',
    claimedAt: '2026-03-01T00:00:00.000Z',
    version: 1,
    images: [],
    ...overrides,
  };
}

const reported = stage({ id: 'reported', name: 'Reported', slug: 'reported', position: 0 });
const claimed = stage({ id: 'claimed', name: 'Claimed', slug: 'claimed', position: 1 });
const cleanup = stage({ id: 'cleanup', name: 'Cleanup scheduled', slug: 'cleanup', position: 2 });
const resolved = stage({ id: 'resolved', name: 'Resolved', slug: 'resolved', position: 3, isFinal: true });

describe('buildBoard', () => {
  it('excludes the reported stage from the columns', () => {
    const { columns } = buildBoard([], [reported, claimed]);
    expect(columns.map((c) => c.stage.id)).toEqual(['claimed']);
  });

  it('buckets incidents into their current stage column', () => {
    const items = [incident({ id: 'a', currentStageId: 'claimed' }), incident({ id: 'b', currentStageId: 'cleanup' })];
    const { columns } = buildBoard(items, [reported, claimed, cleanup]);
    expect(columns.find((c) => c.stage.id === 'claimed')?.incidents.map((i) => i.id)).toEqual(['a']);
    expect(columns.find((c) => c.stage.id === 'cleanup')?.incidents.map((i) => i.id)).toEqual(['b']);
  });

  it('puts an incident whose stage matches nothing into unplaced, not dropped', () => {
    const items = [incident({ id: 'orphan', currentStageId: 'deleted-stage' })];
    const { columns, unplaced } = buildBoard(items, [reported, claimed]);
    const totalOnBoard = columns.reduce((sum, c) => sum + c.incidents.length, 0);
    expect(totalOnBoard).toBe(0);
    expect(unplaced.map((i) => i.id)).toEqual(['orphan']);
  });

  it('puts a null-stage incident into unplaced', () => {
    const items = [incident({ id: 'null-stage', currentStageId: null })];
    const { unplaced } = buildBoard(items, [reported, claimed]);
    expect(unplaced.map((i) => i.id)).toEqual(['null-stage']);
  });

  it('orders incidents within a column oldest first', () => {
    const items = [
      incident({ id: 'new', currentStageId: 'claimed', createdAt: '2026-03-03T00:00:00.000Z' }),
      incident({ id: 'old', currentStageId: 'claimed', createdAt: '2026-03-01T00:00:00.000Z' }),
    ];
    const { columns } = buildBoard(items, [reported, claimed]);
    expect(columns[0].incidents.map((i) => i.id)).toEqual(['old', 'new']);
  });

  it('gives every stage an empty column when there are no incidents', () => {
    const { columns } = buildBoard([], [reported, claimed, cleanup]);
    expect(columns).toHaveLength(2);
    expect(columns.every((c) => c.incidents.length === 0)).toBe(true);
  });

  it('does not crash with an empty stage list', () => {
    expect(buildBoard([incident()], [])).toEqual({ columns: [], unplaced: [incident()] });
  });
});

describe('nextStageFor', () => {
  const stages = [reported, claimed, cleanup, resolved];

  it('returns the next stage by position', () => {
    expect(nextStageFor(claimed, stages)?.id).toBe('cleanup');
  });

  it('returns null for a final stage regardless of position', () => {
    expect(nextStageFor(resolved, stages)).toBeNull();
  });

  it('returns null when already at the last stage', () => {
    const nonFinalLast = stage({ id: 'last', position: 5, isFinal: false });
    expect(nextStageFor(nonFinalLast, [...stages, nonFinalLast])).toBeNull();
  });

  it('never returns the reported stage', () => {
    // claimed is already position 1, directly after reported (0) -- confirm
    // the function would skip reported even if it were somehow next.
    expect(nextStageFor(claimed, stages)?.id).not.toBe('reported');
  });
});

describe('canAdvance', () => {
  it('is true for a non-final stage and false for a final one', () => {
    expect(canAdvance(claimed)).toBe(true);
    expect(canAdvance(resolved)).toBe(false);
  });
});

describe('earliestPostClaimPosition', () => {
  it('returns the lowest position greater than 0', () => {
    expect(earliestPostClaimPosition([reported, claimed, cleanup])).toBe(1);
  });

  it('returns null when every stage is position 0', () => {
    expect(earliestPostClaimPosition([reported])).toBeNull();
  });

  it('returns null for an empty stage list', () => {
    expect(earliestPostClaimPosition([])).toBeNull();
  });
});
