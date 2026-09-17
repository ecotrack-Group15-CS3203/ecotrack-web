/** A short relative age string ("9d", "3h", "just now"), used wherever a
 * precise timestamp is less useful than "how stale is this". Takes `now` as a
 * parameter so callers (and tests) don't depend on the real clock. */
export function relativeAge(iso: string, now: number = Date.now()): string {
  const diffMs = Math.max(0, now - new Date(iso).getTime());
  const days = Math.floor(diffMs / 86_400_000);
  if (days >= 1) return `${days}d`;
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours >= 1) return `${hours}h`;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes >= 1) return `${minutes}m`;
  return 'just now';
}
