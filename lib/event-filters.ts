import type { EventStatus, EventSummary } from './types';

export interface EventFilters {
  status: 'all' | EventStatus;
  upcomingOnly: boolean;
  query: string;
}

/** The events endpoint takes no status/search params, so this runs
 * client-side over the already-fetched page, same as incident-pool's
 * lib/pool-filters.ts. Sorts scheduled/ongoing events soonest-first, then
 * appends past events most-recent-first -- a single chronological sort
 * would bury next week's cleanup under a year of completed ones. `now` is a
 * parameter (not read internally) so this stays callable from a pure
 * `useMemo` without tripping the no-impure-calls-during-render lint rule,
 * and so ranking is testable without clock flake. */
export function filterAndSortEvents(
  events: readonly EventSummary[],
  filters: EventFilters,
  now: number = Date.now(),
): EventSummary[] {
  const query = filters.query.trim().toLowerCase();
  return events
    .filter((event) => filters.status === 'all' || event.status === filters.status)
    .filter((event) => !filters.upcomingOnly || new Date(event.scheduledAt).getTime() >= now)
    .filter((event) => !query || event.title.toLowerCase().includes(query))
    .slice()
    .sort((a, b) => {
      const aTime = new Date(a.scheduledAt).getTime();
      const bTime = new Date(b.scheduledAt).getTime();
      const aUpcoming = aTime >= now;
      const bUpcoming = bTime >= now;
      if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
      return aUpcoming ? aTime - bTime : bTime - aTime;
    });
}
