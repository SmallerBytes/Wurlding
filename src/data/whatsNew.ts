export type WhatsNewEntry = {
  version: string;
  date: string;
  title: string;
  bullets: string[];
};

/**
 * Keep newest entries first.
 * Shown on first launch after updating (once per version).
 */
export const WHATS_NEW: WhatsNewEntry[] = [
  {
    version: '0.1.1',
    date: '2026-04-29',
    title: 'World Web + Map upgrades',
    bullets: [
      'World Web nodes are now manual: add nodes explicitly instead of auto-creating them.',
      'Map Creator: boundary shape dropdown (square/circle/triangle) + draw-your-own (point-to-point + freehand).',
      'Locations: click images to enlarge (cards and uploader).',
    ],
  },
];

