import { useEffect, useRef, useState } from 'react';
import { unlockAlligatorBear, ALLIGATOR_BEAR_UNLOCK_EVENT, isAlligatorBearUnlocked } from '../data/alligatorBear';
import { setCritters } from '../theme';

/**
 * Listens for Ctrl+Shift+A+B (A and B both pressed while Ctrl and Shift are held).
 * First time: unlocks the Sultan of Scales companion and summons him. Later: just summons him.
 */
export default function SecretCritterUnlock() {
  const held = useRef({ a: false, b: false });
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    const clearChord = () => {
      held.current.a = false;
      held.current.b = false;
    };

    const showToast = (message: string) => {
      setToast(message);
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToast(null), 3200);
    };

    const tryUnlock = () => {
      if (!(held.current.a && held.current.b)) return;
      const first = unlockAlligatorBear();
      setCritters('alligator-bear');
      showToast(first ? 'Sultan of Scales unlocked.' : 'Sultan of Scales answers the call.');
      clearChord();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey || !e.shiftKey) {
        clearChord();
        return;
      }
      // Ignore repeats so holding one key doesn't spam.
      if (e.repeat) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === 'a') {
        held.current.a = true;
        e.preventDefault();
        tryUnlock();
      } else if (key === 'b') {
        held.current.b = true;
        e.preventDefault();
        tryUnlock();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === 'a') held.current.a = false;
      if (key === 'b') held.current.b = false;
      if (key === 'Control' || key === 'Shift' || !e.ctrlKey || !e.shiftKey) clearChord();
    };

    const onBlur = () => clearChord();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  // Quietly re-broadcast if something else asks — keeps Settings in sync after a reload.
  useEffect(() => {
    if (!isAlligatorBearUnlocked()) return;
    window.dispatchEvent(
      new CustomEvent(ALLIGATOR_BEAR_UNLOCK_EVENT, { detail: { first: false, hydrate: true } }),
    );
  }, []);

  if (!toast) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-lg border border-arcane/40 bg-abyss/95 px-4 py-2 text-sm text-moonlight shadow-lg backdrop-blur-sm"
      role="status"
    >
      {toast}
    </div>
  );
}
