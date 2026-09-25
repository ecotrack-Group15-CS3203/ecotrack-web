import { describe, expect, it } from 'vitest';
import { isSidebarCollapsed, isThemeMode, resolveTheme } from './theme';

describe('resolveTheme', () => {
  it('uses a stored choice over the device setting', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('follows the device setting when nothing is stored', () => {
    expect(resolveTheme(null, true)).toBe('dark');
    expect(resolveTheme(undefined, false)).toBe('light');
  });

  it('ignores a stored value that is not a theme', () => {
    expect(resolveTheme('sepia', true)).toBe('dark');
    expect(resolveTheme('', false)).toBe('light');
  });
});

describe('isThemeMode', () => {
  it('accepts only light and dark', () => {
    expect(isThemeMode('light')).toBe(true);
    expect(isThemeMode('dark')).toBe(true);
    expect(isThemeMode('system')).toBe(false);
    expect(isThemeMode(null)).toBe(false);
  });
});

describe('isSidebarCollapsed', () => {
  it('is collapsed only for the stored "collapsed" value', () => {
    expect(isSidebarCollapsed('collapsed')).toBe(true);
    expect(isSidebarCollapsed('expanded')).toBe(false);
    expect(isSidebarCollapsed(null)).toBe(false);
    expect(isSidebarCollapsed(undefined)).toBe(false);
  });
});
