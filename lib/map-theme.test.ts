import { describe, expect, it } from 'vitest';
import { MAP_ACCENT, MAP_STYLES, mapThemeFor, statusMarkerColor } from './map-theme';

describe('mapThemeFor', () => {
  it('returns the matching basemap and accent for each theme', () => {
    expect(mapThemeFor('light')).toEqual({ mapStyle: MAP_STYLES.light, accentColor: MAP_ACCENT.light });
    expect(mapThemeFor('dark')).toEqual({ mapStyle: MAP_STYLES.dark, accentColor: MAP_ACCENT.dark });
  });

  // useThemeMode() is null on the server and on the first client render.
  it('falls back to light when the theme is not yet known', () => {
    expect(mapThemeFor(null)).toEqual(mapThemeFor('light'));
  });

  it('never returns an undefined style or accent', () => {
    for (const mode of ['light', 'dark', null] as const) {
      const theme = mapThemeFor(mode);
      expect(theme.mapStyle).toBeTruthy();
      expect(theme.accentColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe('statusMarkerColor', () => {
  const statuses = ['pending', 'approved', 'rejected', 'duplicate'];

  it('gives every status a distinct colour in both themes', () => {
    for (const mode of ['light', 'dark'] as const) {
      const colors = statuses.map((status) => statusMarkerColor(status, mode));
      expect(new Set(colors).size).toBe(statuses.length);
      colors.forEach((color) => expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/));
    }
  });

  it('differs between themes, so markers stay legible on either basemap', () => {
    for (const status of statuses) {
      expect(statusMarkerColor(status, 'light')).not.toBe(statusMarkerColor(status, 'dark'));
    }
  });

  // An incident is null-status while pooled/unclaimed.
  it('treats a null status as pending', () => {
    expect(statusMarkerColor(null, 'light')).toBe(statusMarkerColor('pending', 'light'));
    expect(statusMarkerColor(undefined, 'dark')).toBe(statusMarkerColor('pending', 'dark'));
  });

  it('falls back to the theme accent for an unrecognised status', () => {
    expect(statusMarkerColor('something-new', 'light')).toBe(MAP_ACCENT.light);
    expect(statusMarkerColor('something-new', 'dark')).toBe(MAP_ACCENT.dark);
  });

  it('resolves an unknown theme to light', () => {
    expect(statusMarkerColor('approved', null)).toBe(statusMarkerColor('approved', 'light'));
  });
});
