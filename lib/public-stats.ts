/** GET /v1/public/stats. Any field may be null or 0 on a young platform. */
export interface PublicStats {
  organisations: number | null;
  incidentsResolved: number | null;
  medianClaimMinutes: number | null;
}

/** One tile in the landing page's stats row, ready to render or count up to. */
export interface StatItem {
  key: string;
  label: string;
  value: number;
  decimals: 0 | 1;
  suffix: string;
}

const integerFormat = new Intl.NumberFormat('en');
const oneDecimalFormat = new Intl.NumberFormat('en', { maximumFractionDigits: 1 });

/** Shared by the server-rendered value and every frame of the count-up, so they always match. */
export function formatStatValue(value: number, decimals: 0 | 1, suffix: string): string {
  const number = decimals === 0 ? integerFormat.format(Math.round(value)) : oneDecimalFormat.format(value);
  return `${number}${suffix}`;
}

/** Picks the unit that keeps a duration readable: minutes, then hours, then days. */
export function durationStat(minutes: number): Pick<StatItem, 'value' | 'decimals' | 'suffix'> {
  if (minutes < 60) return { value: round1(minutes), decimals: 1, suffix: ' min' };
  const hours = minutes / 60;
  if (hours < 48) return { value: round1(hours), decimals: 1, suffix: ' h' };
  return { value: round1(hours / 24), decimals: 1, suffix: ' d' };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * A stat is shown only when it's a real, positive number. "0 incidents resolved" on
 * a new deployment undersells the product more than leaving the tile out does. An
 * unavailable API (null stats) hides the whole row.
 */
export function toStatItems(stats: PublicStats | null): StatItem[] {
  if (!stats) return [];
  const items: StatItem[] = [];
  if (stats.incidentsResolved && stats.incidentsResolved > 0) {
    items.push({
      key: 'resolved',
      label: stats.incidentsResolved === 1 ? 'incident resolved' : 'incidents resolved',
      value: stats.incidentsResolved,
      decimals: 0,
      suffix: '',
    });
  }
  if (stats.organisations && stats.organisations > 0) {
    items.push({
      key: 'organisations',
      label: stats.organisations === 1 ? 'organisation on board' : 'organisations on board',
      value: stats.organisations,
      decimals: 0,
      suffix: '',
    });
  }
  if (stats.medianClaimMinutes && stats.medianClaimMinutes > 0) {
    items.push({ key: 'claim', label: 'median time to claim', ...durationStat(stats.medianClaimMinutes) });
  }
  return items;
}
