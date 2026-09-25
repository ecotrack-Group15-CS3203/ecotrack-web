export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'ecotrack-theme';

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

/** An explicit, remembered choice wins; otherwise follow the device setting. */
export function resolveTheme(stored: string | null | undefined, prefersDark: boolean): ThemeMode {
  if (isThemeMode(stored)) return stored;
  return prefersDark ? 'dark' : 'light';
}

/** Dashboard rail state: 'collapsed' (icons only) or anything else = expanded. */
export const SIDEBAR_STORAGE_KEY = 'ecotrack-sidebar';

export function isSidebarCollapsed(stored: string | null | undefined): boolean {
  return stored === 'collapsed';
}

/**
 * Inlined into <head> by the root layout so the theme is set before first paint, with
 * no light-to-dark flash on reload. It can't import anything, so it restates
 * resolveTheme and isSidebarCollapsed above. The device setting is read first, so
 * data-theme is still set when storage is blocked. Only visitors with JS disabled get
 * the light default.
 *
 * It also restores the dashboard's collapsed rail as `data-sidebar="collapsed"`, so a
 * reload doesn't paint the wide rail and then animate it shut.
 *
 * The `js` class lets scroll-reveal hide content only when a script is there to
 * reveal it again.
 *
 * Both the public pages (`.kg`) and the dashboard (`.eco`) read data-theme; only the
 * dashboard reads data-sidebar.
 */
export const THEME_INIT_SCRIPT = `(function(){var r=document.documentElement;r.classList.add('js');var t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';try{var s=localStorage.getItem('${THEME_STORAGE_KEY}');if(s==='light'||s==='dark')t=s;if(localStorage.getItem('${SIDEBAR_STORAGE_KEY}')==='collapsed')r.dataset.sidebar='collapsed';}catch(e){}r.dataset.theme=t;})();`;
