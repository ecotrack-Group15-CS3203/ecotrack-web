import { describe, expect, it } from 'vitest';
import { filterPool, paginate, sortPool, type PoolFilters } from './pool-filters';
import type { PoolIncident } from './types';

function incident(overrides: Partial<PoolIncident> = {}): PoolIncident {
  return {
    id: 'i1',
    title: 'River bank litter',
    description: '',
    category: 'illegal_dumping',
    severity: 'medium',
    address: 'Riverside greenway',
    createdAt: '2026-03-01T00:00:00.000Z',
    lat: 0,
    lng: 0,
    distanceMeters: 1000,
    ...overrides,
  };
}

function baseFilters(overrides: Partial<PoolFilters> = {}): PoolFilters {
  return { query: '', categories: new Set(), severities: new Set(), maxDistanceMeters: null, ...overrides };
}

describe('filterPool', () => {
  it('returns everything when no filter is active', () => {
    const items = [incident(), incident({ id: 'i2' })];
    expect(filterPool(items, baseFilters())).toHaveLength(2);
  });

  it('treats an empty category set as "all", not "none"', () => {
    const items = [incident({ category: 'water_pollution' }), incident({ category: 'other' })];
    expect(filterPool(items, baseFilters({ categories: new Set() }))).toHaveLength(2);
  });

  it('filters by category when the set is non-empty', () => {
    const items = [incident({ category: 'water_pollution' }), incident({ category: 'other' })];
    expect(filterPool(items, baseFilters({ categories: new Set(['other']) }))).toHaveLength(1);
  });

  it('filters by severity', () => {
    const items = [incident({ severity: 'critical' }), incident({ severity: 'low' })];
    expect(filterPool(items, baseFilters({ severities: new Set(['critical']) }))).toHaveLength(1);
  });

  it('applies the distance limit inclusively at the boundary', () => {
    const items = [incident({ distanceMeters: 5000 })];
    expect(filterPool(items, baseFilters({ maxDistanceMeters: 5000 }))).toHaveLength(1);
    expect(filterPool(items, baseFilters({ maxDistanceMeters: 4999 }))).toHaveLength(0);
  });

  it('matches the query against title and address, case-insensitively', () => {
    const items = [incident({ title: 'Oil sheen', address: 'Marina jetty B' })];
    expect(filterPool(items, baseFilters({ query: 'OIL' }))).toHaveLength(1);
    expect(filterPool(items, baseFilters({ query: 'marina' }))).toHaveLength(1);
    expect(filterPool(items, baseFilters({ query: 'no match' }))).toHaveLength(0);
  });

  it('does not crash when address is null', () => {
    const items = [incident({ address: null })];
    expect(filterPool(items, baseFilters({ query: 'river' }))).toHaveLength(1);
  });
});

describe('sortPool', () => {
  it('sorts by distance ascending', () => {
    const items = [incident({ id: 'far', distanceMeters: 5000 }), incident({ id: 'near', distanceMeters: 100 })];
    expect(sortPool(items, 'distance').map((i) => i.id)).toEqual(['near', 'far']);
  });

  it('sorts by newest first', () => {
    const items = [
      incident({ id: 'old', createdAt: '2026-01-01T00:00:00.000Z' }),
      incident({ id: 'new', createdAt: '2026-03-01T00:00:00.000Z' }),
    ];
    expect(sortPool(items, 'newest').map((i) => i.id)).toEqual(['new', 'old']);
  });

  it('sorts by severity, most severe first', () => {
    const items = [
      incident({ id: 'low', severity: 'low' }),
      incident({ id: 'critical', severity: 'critical' }),
      incident({ id: 'medium', severity: 'medium' }),
    ];
    expect(sortPool(items, 'severity').map((i) => i.id)).toEqual(['critical', 'medium', 'low']);
  });

  it('does not mutate the input array', () => {
    const items = [incident({ id: 'a', distanceMeters: 2 }), incident({ id: 'b', distanceMeters: 1 })];
    sortPool(items, 'distance');
    expect(items.map((i) => i.id)).toEqual(['a', 'b']);
  });
});

describe('paginate', () => {
  it('slices to the requested page', () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    expect(paginate(items, 2, 12)).toEqual({ items: items.slice(12, 24), page: 2, pageCount: 3 });
  });

  it('gives an empty list a pageCount of 1, not 0', () => {
    expect(paginate([], 1, 12)).toEqual({ items: [], page: 1, pageCount: 1 });
  });

  it('clamps a page requested past the end to the last page', () => {
    const items = Array.from({ length: 5 }, (_, i) => i);
    expect(paginate(items, 99, 12)).toEqual({ items, page: 1, pageCount: 1 });
  });

  it('clamps a page below 1 up to 1', () => {
    const items = Array.from({ length: 5 }, (_, i) => i);
    expect(paginate(items, 0, 12).page).toBe(1);
  });
});
