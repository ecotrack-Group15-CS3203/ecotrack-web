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

/** "Sat, 4 Oct, 9:00 AM" in the viewer's own locale and timezone -- events
 * are physical meetups, so a browser-local time is what a volunteer needs to
 * show up on time, not a fixed format. No unit test: this is a thin,
 * branchless wrapper over Intl.DateTimeFormat, not logic that can be wrong
 * independent of the browser's own locale data. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}
