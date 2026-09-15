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

/**
 * Inlined into <head> by the root layout so the theme is set before first paint, with
 * no light-to-dark flash on reload. It can't import anything, so it restates
 * resolveTheme above. The device setting is read first, so data-theme is still set
 * when storage is blocked. Only visitors with JS disabled get the light default.
 *
 * The `js` class lets scroll-reveal hide content only when a script is there to
 * reveal it again.
 *
 * Only the public pages' `.kg` styles read data-theme; the dashboard ignores it.
 */
export const THEME_INIT_SCRIPT = `(function(){var r=document.documentElement;r.classList.add('js');var t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';try{var s=localStorage.getItem('${THEME_STORAGE_KEY}');if(s==='light'||s==='dark')t=s;}catch(e){}r.dataset.theme=t;})();`;
