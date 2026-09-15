'use client';

import { useSyncExternalStore } from 'react';
import { isThemeMode, type ThemeMode } from './theme';

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}

function getSnapshot(): ThemeMode | null {
  const theme = document.documentElement.dataset.theme;
  return isThemeMode(theme) ? theme : null;
}

/** The server can't know the theme; null until hydration reads the real value. */
function getServerSnapshot(): ThemeMode | null {
  return null;
}

/** The active public-page theme, kept in sync with <html data-theme>. */
export function useThemeMode(): ThemeMode | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
