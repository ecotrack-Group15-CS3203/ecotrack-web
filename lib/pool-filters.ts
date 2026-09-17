import type { IncidentCategory, IncidentSeverity, PoolIncident } from './types';

export type PoolSort = 'distance' | 'newest' | 'severity';

export interface PoolFilters {
  query: string;
  /** Empty set means "all categories", not "no categories". */
  categories: ReadonlySet<IncidentCategory>;
  /** Empty set means "all severities", not "no severities". */
  severities: ReadonlySet<IncidentSeverity>;
  /** null means no distance limit. Inclusive of the boundary. */
  maxDistanceMeters: number | null;
}

const SEVERITY_RANK: Record<IncidentSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

/** `GET /v1/incidents/pool` takes no query parameters at all, so every one of
 * these filters runs client-side over the full, already-fetched array. */
export function filterPool(items: readonly PoolIncident[], filters: PoolFilters): PoolIncident[] {
  const query = filters.query.trim().toLowerCase();
  return items.filter((item) => {
    if (filters.categories.size > 0 && !filters.categories.has(item.category)) return false;
    if (filters.severities.size > 0 && !filters.severities.has(item.severity)) return false;
    if (filters.maxDistanceMeters !== null && item.distanceMeters > filters.maxDistanceMeters) return false;
    if (query) {
      const haystack = `${item.title} ${item.address ?? ''}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export function sortPool(items: readonly PoolIncident[], sort: PoolSort): PoolIncident[] {
  const copy = items.slice();
  switch (sort) {
    case 'distance':
      return copy.sort((a, b) => a.distanceMeters - b.distanceMeters);
    case 'newest':
      return copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    case 'severity':
      return copy.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
  }
}

export interface Page<T> {
  items: T[];
  page: number;
  pageCount: number;
}

/** `pageCount` of an empty list is 1, not 0 -- there is always at least one
 * (empty) page to show. A requested page beyond the end clamps to the last
 * page rather than returning nothing. */
export function paginate<T>(items: readonly T[], page: number, pageSize: number): Page<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const clampedPage = Math.min(Math.max(1, page), pageCount);
  const start = (clampedPage - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page: clampedPage, pageCount };
}
