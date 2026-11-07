import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
  Sparkles,
  BookOpen,
  ChevronDown,
} from 'lucide-react';
import { WHATS_NEW } from '../data/whatsNew';
import {
  MOTION_EVENT,
  THEME_EVENT,
  getStoredCritterScales,
  getStoredCritters,
  getStoredDesktopCompanions,
  getStoredMotion,
  getStoredTheme,
  previewMotion,
  previewTheme,
  savePreferences,
  type AppPreferences,
  type AppTheme,
  type MotionPref,
} from '../theme';

function formatEntryDate(iso: string): string {
  const [year, month, day] = iso.split('-').map((part) => Number.parseInt(part, 10));
  if (!year || !month || !day) return iso;
  return new Date(year, month - 1, day).toLocaleDateString();
}

type SettingsDraft = {
  theme: AppTheme;
  motion: MotionPref;
};

function readSettingsDraft(): SettingsDraft {
  return {
    theme: getStoredTheme(),
    motion: getStoredMotion(),
  };
}

function sameSettingsDraft(a: SettingsDraft, b: SettingsDraft): boolean {
  return a.theme === b.theme && a.motion === b.motion;
}

function fullPreferences(draft: SettingsDraft): AppPreferences {
  return {
    theme: draft.theme,
    motion: draft.motion,
    critters: getStoredCritters(),
    desktopCompanions: getStoredDesktopCompanions(),
    critterScales: getStoredCritterScales(),
  };
}

/** Apply a draft to this window only (nothing is written until Save). */
function previewAll(prefs: SettingsDraft): void {
  previewTheme(prefs.theme);
  previewMotion(prefs.motion);
}

export default function Settings() {
  const [saved, setSaved] = useState<SettingsDraft>(() => readSettingsDraft());
  const [draft, setDraft] = useState<SettingsDraft>(() => readSettingsDraft());
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const applyingLocal = useRef(false);
  const savingRef = useRef(false);
  const mountedRef = useRef(true);
  const savedRef = useRef(saved);
  const draftRef = useRef(draft);

  useEffect(() => {
    savedRef.current = saved;
    draftRef.current = draft;
  }, [saved, draft]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (savingRef.current) return;
      // Leaving without saving puts the window back to the last saved look.
      if (!sameSettingsDraft(savedRef.current, draftRef.current)) previewAll(savedRef.current);
    };
  }, []);

  useEffect(() => {
    // The desktop menu (or another window) changed a preference: treat it as the new saved state.
    const onTheme = (e: Event) => {
      if (applyingLocal.current) return;
      const detail = (e as CustomEvent<AppTheme>).detail;
      if (detail !== 'light' && detail !== 'dark') return;
      setDraft((d) => ({ ...d, theme: detail }));
      setSaved((s) => ({ ...s, theme: detail }));
      setSaveState('idle');
    };
    const onMotion = (e: Event) => {
      if (applyingLocal.current) return;
      const detail = (e as CustomEvent<MotionPref>).detail;
      if (detail !== 'on' && detail !== 'off') return;
      setDraft((d) => ({ ...d, motion: detail }));
      setSaved((s) => ({ ...s, motion: detail }));
      setSaveState('idle');
    };
    window.addEventListener(THEME_EVENT, onTheme);
    window.addEventListener(MOTION_EVENT, onMotion);
    return () => {
      window.removeEventListener(THEME_EVENT, onTheme);
      window.removeEventListener(MOTION_EVENT, onMotion);
    };
  }, []);

  const chooseTheme = (next: AppTheme) => {
    if (next === draft.theme) return;
    applyingLocal.current = true;
    previewTheme(next);
    applyingLocal.current = false;
    setDraft((d) => ({ ...d, theme: next }));
    setSaveState('idle');
  };

  const toggleMotion = () => {
    const next: MotionPref = draft.motion === 'on' ? 'off' : 'on';
    applyingLocal.current = true;
    previewMotion(next);
    applyingLocal.current = false;
    setDraft((d) => ({ ...d, motion: next }));
    setSaveState('idle');
  };

  const save = async () => {
    if (saveState === 'saving') return;
    const next = draftRef.current;
    savingRef.current = true;
    setSaveState('saving');
    applyingLocal.current = true;
    const ok = await savePreferences(fullPreferences(next));
    applyingLocal.current = false;
    savingRef.current = false;
    if (!mountedRef.current) {
      if (!ok) previewAll(savedRef.current);
      return;
    }
    if (!ok) {
      setSaveState('error');
      return;
    }
    setSaved(next);
    setSaveState('saved');
  };

  const motionOn = draft.motion === 'on';
  const dirty = !sameSettingsDraft(draft, saved);

  return (
    <div className="relative mx-auto max-w-2xl min-h-full">
      <header className="page-header flex-col items-start gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-8 w-8 text-arcane shrink-0" aria-hidden />
          <div>
            <h1 className="page-title font-[Cinzel] text-2xl md:text-3xl">Settings</h1>
            <p className="mt-1 text-sm text-mist">
              Appearance and other preferences for Wurlding.
            </p>
          </div>
        </div>
      </header>

      <div className="wz-stagger space-y-6">
        <section className="card space-y-5 border-dusk/80 bg-shadow/40" aria-labelledby="appearance-heading">
          <div>
            <h2 id="appearance-heading" className="section-title mb-1 font-[Cinzel] text-lg">
              Appearance
            </h2>
            <p className="text-sm text-mist">
              Light mode uses a soft off-white background that is easier on the eyes for long sessions.
              The desktop menu under Settings saves a choice immediately.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Color theme">
            <button
              type="button"
              role="radio"
              aria-checked={draft.theme === 'light'}
              onClick={() => chooseTheme('light')}
              className={`flex items-start gap-3 rounded-lg border p-4 text-left transition ${
                draft.theme === 'light'
                  ? 'border-arcane/50 bg-arcane/10 ring-1 ring-arcane/30'
                  : 'border-dusk/70 bg-abyss/50 hover:border-dusk'
              }`}
            >
              <Sun className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden />
              <span>
                <span className="block font-medium text-moonlight">Light mode</span>
                <span className="mt-1 block text-sm text-mist">
                  Soft parchment off-white — comfortable for writing.
                </span>
              </span>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={draft.theme === 'dark'}
              onClick={() => chooseTheme('dark')}
              className={`flex items-start gap-3 rounded-lg border p-4 text-left transition ${
                draft.theme === 'dark'
                  ? 'border-arcane/50 bg-arcane/10 ring-1 ring-arcane/30'
                  : 'border-dusk/70 bg-abyss/50 hover:border-dusk'
              }`}
            >
              <Moon className="mt-0.5 h-5 w-5 shrink-0 text-mystic" aria-hidden />
              <span>
                <span className="block font-medium text-moonlight">Dark mode</span>
                <span className="mt-1 block text-sm text-mist">
                  Deep abyss palette — the original Wurlding look. The default.
                </span>
              </span>
            </button>
          </div>
        </section>

        <section className="card space-y-4 border-dusk/80 bg-shadow/40" aria-labelledby="motion-heading">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="motion-heading" className="section-title mb-1 flex items-center gap-2 font-[Cinzel] text-lg">
                <Sparkles className={`h-5 w-5 text-gold ${motionOn ? 'wz-float' : ''}`} aria-hidden />
                Animations &amp; whimsy
              </h2>
              <p className="text-sm text-mist">
                Page transitions, drifting motes of light, wiggling icons and other little flourishes.
                Turn this off for a calmer, perfectly still interface. Pixel companions live on the{' '}
                <Link to="/companions" className="text-arcane underline-offset-2 hover:underline">
                  Companions
                </Link>{' '}
                page.
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={motionOn}
              aria-label="Toggle animations"
              onClick={toggleMotion}
              className={`relative mt-1 inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors ${
                motionOn ? 'border-arcane/60 bg-arcane' : 'border-dusk bg-shadow'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-moonlight shadow transition-transform ${
                  motionOn ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <p className="text-xs text-mist/80">
            {motionOn
              ? 'On — Wurlding will sparkle a little. If your system asks for reduced motion this stays off until you enable it here.'
              : 'Off — all decorative motion is disabled, including pixel companions. Functional transitions are kept short.'}
          </p>

          <div className="flex flex-col gap-3 border-t border-dusk/60 pt-4">
            <button
              type="button"
              className="btn-primary w-fit disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => void save()}
              disabled={!dirty || saveState === 'saving'}
            >
              Save preferences
            </button>
            <p className="text-sm text-mist" role="status">
              {saveState === 'saving' && 'Saving preferences…'}
              {saveState === 'saved' && 'Preferences saved. Wurlding will open with this look next time.'}
              {saveState === 'error' && 'Could not save preferences. Keep this window open and try again.'}
              {saveState === 'idle' && dirty && 'Save to keep this theme and animation choice the next time you open Wurlding.'}
              {saveState === 'idle' && !dirty && 'Saved appearance and animations are used the next time you open Wurlding.'}
            </p>
          </div>
        </section>

        <section className="card border-dusk/80 bg-shadow/40" aria-labelledby="updates-heading">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg outline-none marker:content-none [&::-webkit-details-marker]:hidden">
              <div className="min-w-0">
                <h2 id="updates-heading" className="section-title mb-1 flex items-center gap-2 font-[Cinzel] text-lg">
                  <BookOpen className="h-5 w-5 shrink-0 text-arcane" aria-hidden />
                  Updates
                </h2>
                <p className="text-sm text-mist">
                  Latest: v{WHATS_NEW[0]?.version} — {WHATS_NEW[0]?.title}. Open for the full log.
                </p>
              </div>
              <ChevronDown
                className="h-5 w-5 shrink-0 text-mist transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>

            <div className="mt-4 max-h-[min(360px,45vh)] space-y-3 overflow-y-auto border-t border-dusk/60 pt-4 pr-1">
              {WHATS_NEW.map((entry) => (
                <details
                  key={entry.version}
                  className="group/entry rounded-lg border border-dusk/60 bg-abyss/40 open:bg-abyss/60"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0 font-[Cinzel] font-semibold text-moonlight">
                      {entry.title}
                      <span className="ml-2 text-xs font-normal tabular-nums text-mist">v{entry.version}</span>
                    </span>
                    <ChevronDown
                      className="h-4 w-4 shrink-0 text-mist transition-transform group-open/entry:rotate-180"
                      aria-hidden
                    />
                  </summary>
                  <div className="border-t border-dusk/50 px-4 pb-3 pt-2">
                    <p className="text-xs text-mist">
                      <time dateTime={entry.date} className="tabular-nums">
                        {formatEntryDate(entry.date)}
                      </time>
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-silver">
                      {entry.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  </div>
                </details>
              ))}
            </div>
          </details>
        </section>
      </div>
    </div>
  );
}
