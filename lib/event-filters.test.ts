import { describe, expect, it } from 'vitest';
import { filterAndSortEvents } from './event-filters';
import type { EventSummary } from './types';

const NOW = new Date('2026-09-18T12:00:00.000Z').getTime();
const HOUR = 3_600_000;
const DAY = 86_400_000;

function event(overrides: Partial<EventSummary>): EventSummary {
  return {
    id: 'e1',
    title: 'Beach cleanup',
    status: 'scheduled',
    scheduledAt: new Date(NOW + DAY).toISOString(),
    rsvpCount: 4,
    maxAttendees: 20,
    ...overrides,
  } as EventSummary;
}

describe('filterAndSortEvents', () => {
  it('returns everything, upcoming-first, when no filters are active', () => {
    const soon = event({ id: 'soon', scheduledAt: new Date(NOW + HOUR).toISOString() });
    const far = event({ id: 'far', scheduledAt: new Date(NOW + 3 * DAY).toISOString() });
    const result = filterAndSortEvents([far, soon], { status: 'all', upcomingOnly: false, query: '' }, NOW);
    expect(result.map((e) => e.id)).toEqual(['soon', 'far']);
  });

  it('sorts past events most-recent-first and always after every upcoming event', () => {
    const upcoming = event({ id: 'upcoming', scheduledAt: new Date(NOW + DAY).toISOString() });
    const recentPast = event({ id: 'recent', status: 'completed', scheduledAt: new Date(NOW - DAY).toISOString() });
    const oldPast = event({ id: 'old', status: 'completed', scheduledAt: new Date(NOW - 10 * DAY).toISOString() });
    const result = filterAndSortEvents([oldPast, upcoming, recentPast], { status: 'all', upcomingOnly: false, query: '' }, NOW);
    expect(result.map((e) => e.id)).toEqual(['upcoming', 'recent', 'old']);
  });

  it('treats an event starting exactly now as upcoming, not past', () => {
    const rightNow = event({ id: 'now', scheduledAt: new Date(NOW).toISOString() });
    const past = event({ id: 'past', status: 'completed', scheduledAt: new Date(NOW - HOUR).toISOString() });
    const result = filterAndSortEvents([past, rightNow], { status: 'all', upcomingOnly: true, query: '' }, NOW);
    expect(result.map((e) => e.id)).toEqual(['now']);
  });

  it('filters by status', () => {
    const scheduled = event({ id: 's1', status: 'scheduled' });
    const cancelled = event({ id: 'c1', status: 'cancelled' });
    const result = filterAndSortEvents([scheduled, cancelled], { status: 'cancelled', upcomingOnly: false, query: '' }, NOW);
    expect(result.map((e) => e.id)).toEqual(['c1']);
  });

  it('filters upcoming-only, dropping anything already in the past', () => {
    const upcoming = event({ id: 'u1', scheduledAt: new Date(NOW + DAY).toISOString() });
    const past = event({ id: 'p1', status: 'completed', scheduledAt: new Date(NOW - DAY).toISOString() });
    const result = filterAndSortEvents([upcoming, past], { status: 'all', upcomingOnly: true, query: '' }, NOW);
    expect(result.map((e) => e.id)).toEqual(['u1']);
  });

  it('filters by a case-insensitive title search', () => {
    const beach = event({ id: 'b1', title: 'Beach Cleanup Day' });
    const river = event({ id: 'r1', title: 'River restoration' });
    const result = filterAndSortEvents([beach, river], { status: 'all', upcomingOnly: false, query: 'beach' }, NOW);
    expect(result.map((e) => e.id)).toEqual(['b1']);
  });

  it('trims whitespace-only search queries to mean "no filter"', () => {
    const a = event({ id: 'a' });
    const result = filterAndSortEvents([a], { status: 'all', upcomingOnly: false, query: '   ' }, NOW);
    expect(result.map((e) => e.id)).toEqual(['a']);
  });

  it('returns an empty array for an empty input', () => {
    expect(filterAndSortEvents([], { status: 'all', upcomingOnly: false, query: '' }, NOW)).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const a = event({ id: 'a', scheduledAt: new Date(NOW + 2 * DAY).toISOString() });
    const b = event({ id: 'b', scheduledAt: new Date(NOW + DAY).toISOString() });
    const input = [a, b];
    filterAndSortEvents(input, { status: 'all', upcomingOnly: false, query: '' }, NOW);
    expect(input).toEqual([a, b]);
  });
});
