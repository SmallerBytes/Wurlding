import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Moon, Sun, Sparkles } from 'lucide-react';
import {
  MOTION_EVENT,
  THEME_EVENT,
  getStoredMotion,
  getStoredTheme,
  setMotion,
  setTheme,
  type AppTheme,
  type MotionPref,
} from '../theme';

export default function Settings() {
  const [theme, setThemeState] = useState<AppTheme>(() => getStoredTheme());
  const [motion, setMotionState] = useState<MotionPref>(() => getStoredMotion());

  useEffect(() => {
    const onTheme = (e: Event) => {
      const detail = (e as CustomEvent<AppTheme>).detail;
      if (detail === 'light' || detail === 'dark') setThemeState(detail);
    };
    const onMotion = (e: Event) => {
      const detail = (e as CustomEvent<MotionPref>).detail;
      if (detail === 'on' || detail === 'off') setMotionState(detail);
    };
    window.addEventListener(THEME_EVENT, onTheme);
    window.addEventListener(MOTION_EVENT, onMotion);
    return () => {
      window.removeEventListener(THEME_EVENT, onTheme);
      window.removeEventListener(MOTION_EVENT, onMotion);
    };
  }, []);

  const choose = (next: AppTheme) => {
    setTheme(next);
    setThemeState(next);
  };

  const toggleMotion = () => {
    const next: MotionPref = motion === 'on' ? 'off' : 'on';
    setMotion(next);
    setMotionState(next);
  };

  const motionOn = motion === 'on';

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
              In the desktop app you can also change this under Settings → Appearance.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Color theme">
            <button
              type="button"
              role="radio"
              aria-checked={theme === 'light'}
              onClick={() => choose('light')}
              className={`flex items-start gap-3 rounded-lg border p-4 text-left transition ${
                theme === 'light'
                  ? 'border-arcane/50 bg-arcane/10 ring-1 ring-arcane/30'
                  : 'border-dusk/70 bg-abyss/50 hover:border-dusk'
              }`}
            >
              <Sun className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden />
              <span>
                <span className="block font-medium text-moonlight">Light mode</span>
                <span className="mt-1 block text-sm text-mist">
                  Soft parchment off-white — comfortable for writing. The default.
                </span>
              </span>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={theme === 'dark'}
              onClick={() => choose('dark')}
              className={`flex items-start gap-3 rounded-lg border p-4 text-left transition ${
                theme === 'dark'
                  ? 'border-arcane/50 bg-arcane/10 ring-1 ring-arcane/30'
                  : 'border-dusk/70 bg-abyss/50 hover:border-dusk'
              }`}
            >
              <Moon className="mt-0.5 h-5 w-5 shrink-0 text-mystic" aria-hidden />
              <span>
                <span className="block font-medium text-moonlight">Dark mode</span>
                <span className="mt-1 block text-sm text-mist">
                  Deep abyss palette — the original Wurlding look.
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
                Turn this off for a calmer, perfectly still interface.
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
              : 'Off — all decorative motion is disabled. Functional transitions are kept short.'}
          </p>
        </section>
      </div>
    </div>
  );
}
