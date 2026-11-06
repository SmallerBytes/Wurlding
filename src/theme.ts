import { API_BASE } from './api';
import { isCritterGenre, type CritterGenre } from './data/pixelCritters';

export type AppTheme = 'dark' | 'light';
export type MotionPref = 'on' | 'off';
export type { CritterGenre };
export type AppPreferences = { theme: AppTheme; motion: MotionPref; critters: CritterGenre };

export const THEME_STORAGE_KEY = 'wurlding:theme';
export const THEME_EVENT = 'wurlding:theme';
export const MOTION_STORAGE_KEY = 'wurlding:motion';
export const MOTION_EVENT = 'wurlding:motion';
export const CRITTERS_STORAGE_KEY = 'wurlding:critters';
export const CRITTERS_EVENT = 'wurlding:critters';

export const DEFAULT_THEME: AppTheme = 'dark';
export const DEFAULT_CRITTERS: CritterGenre = 'fae-princess';

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

/** Apply a theme in this window without writing the saved preference. */
export function previewTheme(theme: AppTheme): void {
  applyTheme(theme);
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }));
}

export function setTheme(theme: AppTheme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore
  }
  previewTheme(theme);
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

/** Apply motion in this window without writing the saved preference. */
export function previewMotion(pref: MotionPref): void {
  applyMotion(pref);
  window.dispatchEvent(new CustomEvent(MOTION_EVENT, { detail: pref }));
}

export function setMotion(pref: MotionPref): void {
  try {
    localStorage.setItem(MOTION_STORAGE_KEY, pref);
  } catch {
    // ignore
  }
  previewMotion(pref);
}

export function initMotion(): MotionPref {
  const pref = getStoredMotion();
  applyMotion(pref);
  return pref;
}

function isMotionPref(value: unknown): value is MotionPref {
  return value === 'on' || value === 'off';
}

/** Which pixel companions roam the window. */
export function getStoredCritters(): CritterGenre {
  try {
    const raw = localStorage.getItem(CRITTERS_STORAGE_KEY);
    // Fae Court was replaced by Fae Princess.
    if (raw === 'fae') return 'fae-princess';
    if (isCritterGenre(raw)) return raw;
  } catch {
    // ignore
  }
  return DEFAULT_CRITTERS;
}

/** Switch companions in this window without writing the saved preference. */
export function previewCritters(genre: CritterGenre): void {
  window.dispatchEvent(new CustomEvent(CRITTERS_EVENT, { detail: genre }));
}

export function setCritters(genre: CritterGenre): void {
  try {
    localStorage.setItem(CRITTERS_STORAGE_KEY, genre);
  } catch {
    // ignore
  }
  previewCritters(genre);
}

/** Preferences stored beside the world data file. Null when the user has never saved. */
export async function fetchSavedPreferences(): Promise<AppPreferences | null> {
  try {
    const res = await fetch(`${API_BASE}/api/preferences`);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: { theme?: unknown; motion?: unknown; critters?: unknown } | null;
    };
    const data = json?.data;
    if (!data || !isAppTheme(data.theme) || !isMotionPref(data.motion)) return null;
    return {
      theme: data.theme,
      motion: data.motion,
      // Older preference files predate companions; fall back to the default cast.
      critters:
        data.critters === 'fae'
          ? 'fae-princess'
          : isCritterGenre(data.critters)
            ? data.critters
            : DEFAULT_CRITTERS,
    };
  } catch {
    return null;
  }
}

/** Write theme and motion to disk, then mirror them into this window. */
export async function savePreferences(prefs: AppPreferences): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs),
    });
    if (!res.ok) return false;
  } catch {
    return false;
  }
  setTheme(prefs.theme);
  setMotion(prefs.motion);
  setCritters(prefs.critters);
  try {
    window.wurldingDesktop?.preferencesSaved(prefs);
  } catch {
    // Browser dev has no desktop bridge.
  }
  return true;
}
