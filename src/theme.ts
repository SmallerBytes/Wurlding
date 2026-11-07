import { API_BASE } from './api';
import { isCritterGenre, type CritterGenre } from './data/pixelCritters';

export type AppTheme = 'dark' | 'light';
export type MotionPref = 'on' | 'off';
export type { CritterGenre };
/** Selected companion genres. Empty means off. Never includes `'off'`. */
export type CritterSelection = CritterGenre[];
export type AppPreferences = {
  theme: AppTheme;
  motion: MotionPref;
  critters: CritterSelection;
  /** When true, companions also roam a transparent always-on-top desktop overlay. */
  desktopCompanions?: boolean;
};

/** Soft cap so the window doesn't fill with every cast at once. */
export const MAX_CRITTER_SELECTIONS = 5;

export function normalizeCritterSelection(raw: unknown): CritterSelection {
  if (raw == null || raw === 'off') return [];
  if (raw === 'fae') return ['fae-princess'];
  if (typeof raw === 'string') {
    if (raw.startsWith('[')) {
      try {
        return normalizeCritterSelection(JSON.parse(raw) as unknown);
      } catch {
        return [];
      }
    }
    return isCritterGenre(raw) && raw !== 'off' ? [raw] : [];
  }
  if (Array.isArray(raw)) {
    const out: CritterGenre[] = [];
    for (const item of raw) {
      const g = item === 'fae' ? 'fae-princess' : item;
      if (!isCritterGenre(g) || g === 'off') continue;
      if (!out.includes(g)) out.push(g);
      if (out.length >= MAX_CRITTER_SELECTIONS) break;
    }
    return out;
  }
  return [];
}

export function serializeCritterSelection(sel: CritterSelection): string {
  const normalized = normalizeCritterSelection(sel);
  if (normalized.length === 0) return 'off';
  if (normalized.length === 1) return normalized[0]!;
  return JSON.stringify(normalized);
}

export function sameCritterSelection(a: CritterSelection, b: CritterSelection): boolean {
  if (a.length !== b.length) return false;
  return a.every((g, i) => g === b[i]);
}

export const THEME_STORAGE_KEY = 'wurlding:theme';
export const THEME_EVENT = 'wurlding:theme';
export const MOTION_STORAGE_KEY = 'wurlding:motion';
export const MOTION_EVENT = 'wurlding:motion';
export const CRITTERS_STORAGE_KEY = 'wurlding:critters';
export const CRITTERS_EVENT = 'wurlding:critters';
export const DESKTOP_COMPANIONS_STORAGE_KEY = 'wurlding:desktop-companions';
export const DESKTOP_COMPANIONS_EVENT = 'wurlding:desktop-companions';

export const DEFAULT_THEME: AppTheme = 'dark';
export const DEFAULT_CRITTERS: CritterSelection = ['fae-princess'];

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

/** Which pixel companions roam the window (empty = none). */
export function getStoredCritters(): CritterSelection {
  try {
    const raw = localStorage.getItem(CRITTERS_STORAGE_KEY);
    const parsed = normalizeCritterSelection(raw);
    if (raw == null) return [...DEFAULT_CRITTERS];
    return parsed;
  } catch {
    // ignore
  }
  return [...DEFAULT_CRITTERS];
}

/** Switch companions in this window without writing the saved preference. */
export function previewCritters(selection: CritterSelection): void {
  window.dispatchEvent(
    new CustomEvent(CRITTERS_EVENT, { detail: normalizeCritterSelection(selection) }),
  );
}

export function setCritters(selection: CritterSelection): void {
  const normalized = normalizeCritterSelection(selection);
  try {
    localStorage.setItem(CRITTERS_STORAGE_KEY, serializeCritterSelection(normalized));
  } catch {
    // ignore
  }
  previewCritters(normalized);
}

export function getStoredDesktopCompanions(): boolean {
  try {
    return localStorage.getItem(DESKTOP_COMPANIONS_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function previewDesktopCompanions(enabled: boolean): void {
  window.dispatchEvent(new CustomEvent(DESKTOP_COMPANIONS_EVENT, { detail: enabled }));
}

export function setDesktopCompanions(enabled: boolean): void {
  try {
    localStorage.setItem(DESKTOP_COMPANIONS_STORAGE_KEY, enabled ? '1' : '0');
  } catch {
    // ignore
  }
  previewDesktopCompanions(enabled);
  try {
    window.wurldingDesktop?.setDesktopCompanions?.(enabled);
  } catch {
    // Browser / non-Electron.
  }
}

/** Preferences stored beside the world data file. Null when the user has never saved. */
export async function fetchSavedPreferences(): Promise<AppPreferences | null> {
  try {
    const res = await fetch(`${API_BASE}/api/preferences`);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: {
        theme?: unknown;
        motion?: unknown;
        critters?: unknown;
        desktopCompanions?: unknown;
      } | null;
    };
    const data = json?.data;
    if (!data || !isAppTheme(data.theme) || !isMotionPref(data.motion)) return null;
    const critters =
      data.critters === undefined ? [...DEFAULT_CRITTERS] : normalizeCritterSelection(data.critters);
    return {
      theme: data.theme,
      motion: data.motion,
      // Older preference files predate companions; fall back to the default cast.
      critters: data.critters === undefined ? [...DEFAULT_CRITTERS] : critters,
      desktopCompanions: data.desktopCompanions === true,
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
  if (typeof prefs.desktopCompanions === 'boolean') {
    setDesktopCompanions(prefs.desktopCompanions);
  }
  try {
    window.wurldingDesktop?.preferencesSaved(prefs);
  } catch {
    // Browser dev has no desktop bridge.
  }
  return true;
}
