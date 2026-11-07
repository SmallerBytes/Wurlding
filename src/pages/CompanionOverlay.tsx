import { useLayoutEffect } from 'react';
import PixelCritters from '../components/PixelCritters';

/**
 * Transparent Electron overlay: companions roam the desktop even when the main
 * window is minimized. Click-through is handled by the BrowserWindow.
 */
export default function CompanionOverlay() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.setAttribute('data-companion-overlay', 'true');
    const prevHtmlBg = root.style.backgroundColor;
    const prevBodyBg = body.style.backgroundColor;
    root.style.backgroundColor = 'transparent';
    body.style.backgroundColor = 'transparent';
    return () => {
      root.removeAttribute('data-companion-overlay');
      root.style.backgroundColor = prevHtmlBg;
      body.style.backgroundColor = prevBodyBg;
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden bg-transparent">
      <PixelCritters />
    </div>
  );
}
