'use client';

import { useEffect } from 'react';
import { isThemeMode, THEME_STORAGE_KEY, type ThemeMode } from '@/lib/theme';
import { useThemeMode } from '@/lib/use-theme-mode';
import { IconMoon, IconSun } from '../icons';

function readStoredTheme(): string | null {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
}

export function ThemeToggle() {
  const mode = useThemeMode();
  const isDark = mode === 'dark';

  // Until someone picks a theme, keep following the device, including a change made
  // while the page is open.
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => {
      if (!isThemeMode(readStoredTheme())) applyTheme(event.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  function toggle() {
    const next: ThemeMode = isDark ? 'light' : 'dark';
    applyTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage blocked: the switch still applies for this page view.
    }
  }

  return (
    <button
      type="button"
      className="kg-icon-btn"
      onClick={toggle}
      aria-label="Dark theme"
      aria-pressed={isDark}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {mode === null ? (
        <span className="kg-icon-slot" aria-hidden="true" />
      ) : isDark ? (
        <IconSun key="sun" className="kg-theme-icon" />
      ) : (
        <IconMoon key="moon" className="kg-theme-icon" />
      )}
    </button>
  );
}
