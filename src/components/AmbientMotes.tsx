import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { MOTION_EVENT, THEME_EVENT, getStoredMotion, getStoredTheme, type AppTheme, type MotionPref } from '../theme';

const MOTE_COUNT = 16;

/** Deterministic pseudo-random so the field looks the same across re-renders. */
function seeded(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Soft points of light drifting up behind the app — gold dust in light mode, arcane motes in dark.
 * Purely decorative; hidden entirely when Settings → Animations is off.
 */
export default function AmbientMotes() {
  const [motion, setMotion] = useState<MotionPref>(() => getStoredMotion());
  const [theme, setTheme] = useState<AppTheme>(() => getStoredTheme());

  useEffect(() => {
    const onMotion = (e: Event) => {
      const d = (e as CustomEvent<MotionPref>).detail;
      if (d === 'on' || d === 'off') setMotion(d);
    };
    const onTheme = (e: Event) => {
      const d = (e as CustomEvent<AppTheme>).detail;
      if (d === 'light' || d === 'dark') setTheme(d);
    };
    window.addEventListener(MOTION_EVENT, onMotion);
    window.addEventListener(THEME_EVENT, onTheme);
    return () => {
      window.removeEventListener(MOTION_EVENT, onMotion);
      window.removeEventListener(THEME_EVENT, onTheme);
    };
  }, []);

  const motes = useMemo(() => {
    const palette =
      theme === 'light'
        ? ['rgba(245, 158, 11, 0.85)', 'rgba(124, 58, 237, 0.55)', 'rgba(217, 119, 6, 0.7)']
        : ['rgba(167, 139, 250, 0.9)', 'rgba(245, 158, 11, 0.6)', 'rgba(34, 211, 238, 0.55)'];
    return Array.from({ length: MOTE_COUNT }, (_, i) => {
      const size = 3 + Math.round(seeded(i, 1) * 5);
      const style: CSSProperties & Record<`--${string}`, string> = {
        left: `${Math.round(seeded(i, 2) * 100)}%`,
        width: size,
        height: size,
        '--mote-color': palette[i % palette.length]!,
        '--mote-duration': `${18 + Math.round(seeded(i, 3) * 16)}s`,
        '--mote-delay': `${-Math.round(seeded(i, 4) * 30)}s`,
        '--mote-dx': `${Math.round((seeded(i, 5) - 0.5) * 80)}px`,
        '--mote-alpha': `${(0.35 + seeded(i, 6) * 0.4).toFixed(2)}`,
        '--mote-twinkle': `${(1.8 + seeded(i, 7) * 2.4).toFixed(1)}s`,
      };
      return { id: i, style };
    });
  }, [theme]);

  if (motion !== 'on') return null;

  return (
    <div className="wz-motes" aria-hidden>
      {motes.map((m) => (
        <span key={m.id} className="wz-mote" style={m.style} />
      ))}
    </div>
  );
}
