/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface WurldingDesktopBridge {
  preferencesSaved: (prefs: { theme: 'light' | 'dark'; motion: 'on' | 'off'; critters: string }) => void;
}

interface Window {
  wurldingDesktop?: WurldingDesktopBridge;
}
