import type { ThemeMode } from './theme';

/**
 * Basemap, accent and marker colours for both themes.
 *
 * The light basemap is `light-v11` rather than `streets-v12`: a full-colour
 * street map competes with the markers drawn on top of it, and the muted style
 * is what the public pages already use.
 */
export const MAP_STYLES = {
  light: 'mapbox://styles/mapbox/light-v11',
  dark: 'mapbox://styles/mapbox/dark-v11',
} as const;

export const MAP_ACCENT = { light: '#0F6E56', dark: '#35C495' } as const;

const STATUS_COLORS = {
  light: { pending: '#B45309', approved: '#2563EB', rejected: '#C0392B', duplicate: '#64748B' },
  dark: { pending: '#FBBF4A', approved: '#7DB8F0', rejected: '#F5928C', duplicate: '#94A3B8' },
} as const;

// useThemeMode() is null on the server and on the first client render, so every
// entry point here resolves null to light rather than returning undefined.
function resolve(mode: ThemeMode | null): 'light' | 'dark' {
  return mode ?? 'light';
}

export function mapThemeFor(mode: ThemeMode | null): { mapStyle: string; accentColor: string } {
  const key = resolve(mode);
  return { mapStyle: MAP_STYLES[key], accentColor: MAP_ACCENT[key] };
}

/**
 * `status` is null while an incident is pooled/unclaimed; 'pending' is the
 * closest equivalent to that state. An unrecognised status falls back to the
 * theme accent rather than to undefined.
 */
export function statusMarkerColor(status: string | null | undefined, mode: ThemeMode | null): string {
  const key = resolve(mode);
  const palette: Record<string, string> = STATUS_COLORS[key];
  return palette[status ?? 'pending'] ?? MAP_ACCENT[key];
}
