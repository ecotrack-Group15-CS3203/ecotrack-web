import { describe, expect, it } from 'vitest';
import { isColorHex, isReported, sortStages } from './workflow-helpers';
import type { WorkflowStage } from './types';

function stage(overrides: Partial<WorkflowStage>): WorkflowStage {
  return {
    id: overrides.id ?? 'stage-id',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    organisationId: 'org-id',
    name: 'Stage',
    slug: 'stage',
    description: null,
    color: '#000000',
    position: 0,
    isFinal: false,
    ...overrides,
  };
}

describe('sortStages', () => {
  it('orders by position ascending', () => {
    const stages = [stage({ id: 'c', position: 2 }), stage({ id: 'a', position: 0 }), stage({ id: 'b', position: 1 })];
    expect(sortStages(stages).map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate the input array', () => {
    const stages = [stage({ id: 'b', position: 1 }), stage({ id: 'a', position: 0 })];
    const original = [...stages];
    sortStages(stages);
    expect(stages).toEqual(original);
  });
});

describe('isReported', () => {
  it('is true for the position-0 stage regardless of slug', () => {
    expect(isReported(stage({ position: 0, slug: 'anything' }))).toBe(true);
  });

  it('is true for a non-zero-position stage whose slug is "reported"', () => {
    // Real orgs cannot rename this slug (immutable per the workflow module),
    // but a stage created before that constraint existed, or reordered, could
    // still carry the slug at a non-zero position — the function should catch
    // either signal, not just position.
    expect(isReported(stage({ position: 3, slug: 'reported' }))).toBe(true);
  });

  it('is false for a non-initial, non-"reported" stage', () => {
    expect(isReported(stage({ position: 1, slug: 'claimed' }))).toBe(false);
  });
});

describe('isColorHex', () => {
  it('accepts a 6-digit hex color', () => {
    expect(isColorHex('#0F6E56')).toBe(true);
    expect(isColorHex('#ffffff')).toBe(true);
  });

  it.each(['0F6E56', '#0F6E5', '#GGGGGG', '#0F6E566', ''])(
    'rejects %s',
    (value) => {
      expect(isColorHex(value)).toBe(false);
    },
  );
});
