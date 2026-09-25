export type AppTheme = 'dark' | 'light';
export type MotionPref = 'on' | 'off';

export const THEME_STORAGE_KEY = 'wurlding:theme';
export const THEME_EVENT = 'wurlding:theme';
export const MOTION_STORAGE_KEY = 'wurlding:motion';
export const MOTION_EVENT = 'wurlding:motion';

export const DEFAULT_THEME: AppTheme = 'light';

export function isAppTheme(value: unknown): value is AppTheme {
  return value === 'dark' || value === 'light';
}

export function getStoredTheme(): AppTheme {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (isAppTheme(raw)) return raw;
  } catch {
    // ignore
  }
  return DEFAULT_THEME;
}

export function applyTheme(theme: AppTheme): void {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
}

export function setTheme(theme: AppTheme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore
  }
  applyTheme(theme);
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }));
}

export function initTheme(): AppTheme {
  const theme = getStoredTheme();
  applyTheme(theme);
  return theme;
}

/**
 * Whimsical motion (page transitions, floating motes, hover wiggles) is on unless the user turned it
 * off — or their OS asks for reduced motion and they never chose explicitly.
 */
export function getStoredMotion(): MotionPref {
  try {
    const raw = localStorage.getItem(MOTION_STORAGE_KEY);
    if (raw === 'on' || raw === 'off') return raw;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 'off';
  } catch {
    // ignore
  }
  return 'on';
}

export function applyMotion(pref: MotionPref): void {
  document.documentElement.setAttribute('data-motion', pref);
}

export function setMotion(pref: MotionPref): void {
  try {
    localStorage.setItem(MOTION_STORAGE_KEY, pref);
  } catch {
    // ignore
  }
  applyMotion(pref);
  window.dispatchEvent(new CustomEvent(MOTION_EVENT, { detail: pref }));
}

export function initMotion(): MotionPref {
  const pref = getStoredMotion();
  applyMotion(pref);
  return pref;
}
