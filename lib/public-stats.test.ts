import { describe, expect, it } from 'vitest';
import { durationStat, formatStatValue, toStatItems } from './public-stats';

describe('toStatItems', () => {
  it('hides the whole row when the stats could not be loaded', () => {
    expect(toStatItems(null)).toEqual([]);
  });

  it('leaves out stats that are null or zero', () => {
    const items = toStatItems({ organisations: 0, incidentsResolved: 12, medianClaimMinutes: null });
    expect(items.map((i) => i.key)).toEqual(['resolved']);
  });

  it('shows all three when every value is positive, in a fixed order', () => {
    const items = toStatItems({ organisations: 340, incidentsResolved: 12480, medianClaimMinutes: 9.2 });
    expect(items.map((i) => i.key)).toEqual(['resolved', 'organisations', 'claim']);
  });

  it('uses singular labels for a count of one', () => {
    const items = toStatItems({ organisations: 1, incidentsResolved: 1, medianClaimMinutes: null });
    expect(items.map((i) => i.label)).toEqual(['incident resolved', 'organisation on board']);
  });
});

describe('formatStatValue', () => {
  it('adds thousands separators to whole numbers', () => {
    expect(formatStatValue(12480, 0, '')).toBe('12,480');
  });

  it('keeps one decimal, dropping a trailing zero', () => {
    expect(formatStatValue(9.2, 1, ' min')).toBe('9.2 min');
    expect(formatStatValue(2, 1, ' h')).toBe('2 h');
  });
});

describe('durationStat', () => {
  it('stays in minutes under an hour', () => {
    expect(durationStat(9.24)).toEqual({ value: 9.2, decimals: 1, suffix: ' min' });
  });

  it('switches to hours, then days', () => {
    expect(durationStat(126)).toEqual({ value: 2.1, decimals: 1, suffix: ' h' });
    expect(durationStat(60 * 72)).toEqual({ value: 3, decimals: 1, suffix: ' d' });
  });
});
