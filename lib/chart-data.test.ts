import { describe, expect, it } from 'vitest';
import {
  donutArcs, toCategorySeries, toClosureSeries, toSeveritySeries, toStageSeries, toTaskStatusSeries,
} from './chart-data';
import type { Incident, WorkflowStage } from './types';

function stage(overrides: Partial<WorkflowStage>): WorkflowStage {
  return {
    id: 's', createdAt: '', updatedAt: '', organisationId: 'org1', name: 'Stage', slug: 'stage',
    description: null, color: '#0F6E56', position: 1, isFinal: false, ...overrides,
  };
}

function incident(overrides: Partial<Incident>): Incident {
  return {
    id: 'i', createdAt: '2026-03-01T00:00:00.000Z', updatedAt: '', organisationId: 'org1',
    reportedByUserId: null, title: 't', description: '', category: 'illegal_dumping', severity: 'medium',
    location: { lat: 0, lng: 0 }, address: null, verificationStatus: 'approved', currentStageId: null,
    rejectionReason: null, duplicateOfId: null, claimedByUserId: null, claimedAt: null, version: 1, images: [],
    ...overrides,
  };
}

describe('toCategorySeries', () => {
  it('maps known categories to their defined colour', () => {
    const series = toCategorySeries([{ category: 'water_pollution', count: 5 }]);
    expect(series).toEqual([{ label: 'water pollution', value: 5, color: 'var(--verified)' }]);
  });

  it('falls back to a defined neutral colour for an unrecognised category', () => {
    const series = toCategorySeries([{ category: 'something_new', count: 2 }]);
    expect(series[0].color).toBe('var(--text-3)');
  });

  it('drops zero-count categories', () => {
    expect(toCategorySeries([{ category: 'other', count: 0 }])).toHaveLength(0);
  });
});

describe('toStageSeries', () => {
  const stages = [
    stage({ id: 'a', name: 'Claimed', position: 1 }),
    stage({ id: 'b', name: 'Resolved', position: 2 }),
  ];

  it('counts incidents by current stage, ordered by stage position', () => {
    const incidents = [
      incident({ currentStageId: 'b' }),
      incident({ currentStageId: 'a' }),
      incident({ currentStageId: 'a' }),
    ];
    expect(toStageSeries(incidents, stages)).toEqual([
      { label: 'Claimed', value: 2, color: '#0F6E56' },
      { label: 'Resolved', value: 1, color: '#0F6E56' },
    ]);
  });

  it('omits a stage with no incidents', () => {
    const incidents = [incident({ currentStageId: 'a' })];
    expect(toStageSeries(incidents, stages).map((d) => d.label)).toEqual(['Claimed']);
  });

  it('ignores incidents with a null or unknown stage', () => {
    const incidents = [incident({ currentStageId: null }), incident({ currentStageId: 'ghost' })];
    expect(toStageSeries(incidents, stages)).toEqual([]);
  });
});

describe('toSeveritySeries', () => {
  it('orders most severe first and drops absent severities', () => {
    const incidents = [incident({ severity: 'low' }), incident({ severity: 'critical' })];
    expect(toSeveritySeries(incidents).map((d) => d.label)).toEqual(['Critical', 'Low']);
  });
});

describe('toTaskStatusSeries', () => {
  it('labels pending as Scheduled and drops absent statuses', () => {
    const series = toTaskStatusSeries([{ status: 'pending' }, { status: 'pending' }, { status: 'completed' }]);
    expect(series).toEqual([
      { label: 'Scheduled', value: 2, color: 'var(--pending)' },
      { label: 'Completed', value: 1, color: 'var(--resolved)' },
    ]);
  });
});

describe('toClosureSeries', () => {
  it('splits into closed and open', () => {
    expect(toClosureSeries(10, 6)).toEqual([
      { label: 'Closed (resolved or dismissed)', value: 6, color: 'var(--resolved)' },
      { label: 'Open', value: 4, color: 'var(--border-strong)' },
    ]);
  });

  it('clamps a negative open count to zero rather than going negative', () => {
    expect(toClosureSeries(3, 5)[1].value).toBe(0);
  });
});

describe('donutArcs', () => {
  it('sums arc lengths to the circumference', () => {
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const arcs = donutArcs([{ label: 'a', value: 3, color: 'red' }, { label: 'b', value: 1, color: 'blue' }], radius);
    const total = arcs.reduce((sum, arc) => sum + Number(arc.dashArray.split(' ')[0]), 0);
    expect(total).toBeCloseTo(circumference, 5);
  });

  it('returns an empty array for a zero total, rather than NaN', () => {
    const arcs = donutArcs([{ label: 'a', value: 0, color: 'red' }], 50);
    expect(arcs).toEqual([]);
  });

  it('returns an empty array for a negative total', () => {
    expect(donutArcs([{ label: 'a', value: -5, color: 'red' }], 50)).toEqual([]);
  });

  it('renders one full-length arc for a single 100% segment', () => {
    const radius = 20;
    const circumference = 2 * Math.PI * radius;
    const arcs = donutArcs([{ label: 'a', value: 10, color: 'red' }], radius);
    expect(arcs).toHaveLength(1);
    expect(Number(arcs[0].dashArray.split(' ')[0])).toBeCloseTo(circumference, 5);
    expect(arcs[0].dashOffset).toBe(-0);
  });

  it('drops a zero-value segment from a mixed set without affecting others', () => {
    const arcs = donutArcs([{ label: 'a', value: 0, color: 'red' }, { label: 'b', value: 5, color: 'blue' }], 30);
    expect(arcs.map((arc) => arc.label)).toEqual(['b']);
  });
});
