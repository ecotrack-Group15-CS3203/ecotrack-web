'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { SIDEBAR_STORAGE_KEY } from './theme';

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-sidebar'] });
  return () => observer.disconnect();
}

function getSnapshot(): boolean {
  return document.documentElement.dataset.sidebar === 'collapsed';
}

/** The server can't read storage; the rail renders expanded until hydration. The
 *  CSS reads <html data-sidebar> (set pre-paint by THEME_INIT_SCRIPT) directly, so
 *  this only affects labels like aria-expanded, never the first painted layout. */
function getServerSnapshot(): boolean {
  return false;
}

/**
 * The dashboard rail's desktop collapsed state, stored on <html data-sidebar>
 * (so CSS can animate off it) and remembered in localStorage.
 */
export function useSidebarCollapsed(): [boolean, () => void] {
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const root = document.documentElement;
    const next = root.dataset.sidebar !== 'collapsed';
    if (next) root.dataset.sidebar = 'collapsed';
    else delete root.dataset.sidebar;
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? 'collapsed' : 'expanded');
    } catch {
      // Storage blocked: the rail still toggles for this page view.
    }
  }, []);

  return [collapsed, toggle];
}
