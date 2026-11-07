/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface WurldingDesktopBridge {
  preferencesSaved: (prefs: {
    theme: 'light' | 'dark';
    motion: 'on' | 'off';
    critters: string;
    desktopCompanions?: boolean;
  }) => void;
  setDesktopCompanions?: (enabled: boolean) => void;
  getDesktopCompanions?: () => Promise<boolean>;
  isCompanionOverlay?: () => Promise<boolean>;
}

interface Window {
  wurldingDesktop?: WurldingDesktopBridge;
}
