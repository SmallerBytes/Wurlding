export type WhatsNewEntry = {
  version: string;
  date: string;
  title: string;
  bullets: string[];
};

/**
 * Keep newest entries first.
 * Shown as the updates log on the Settings page.
 */
export const WHATS_NEW: WhatsNewEntry[] = [
  {
    version: '0.1.12',
    date: '2026-11-05',
    title: 'More companions and a darker default',
    bullets: [
      'New atlas companions: Crabacus, Emerald Wyvern, and The Void Walker — each with their own walk and flourish cycles.',
      'Alligator Bear is now the Sultan of Scales, with cleaner outlines and a better sleep hold pose.',
      'Dark mode is the default for new installs; light mode stays available in Settings.',
    ],
  },
  {
    version: '0.1.10',
    date: '2026-11-05',
    title: 'Settings, updates log, and pixel companions',
    bullets: [
      'Update notes live in Settings instead of a pop-up on every launch.',
      'Save preferences keeps light/dark mode, animations, and companion choices for the next time you open Wurlding.',
      'Pixel companions: pick a genre in Settings and 16-bit creatures roam the window — perching on cards, hopping between panels, and circling your work.',
      'Casts include Fae court, Dragon’s roost, Goblin warren, Wild meadow, and a full menagerie.',
    ],
  },
  {
    version: '0.1.9',
    date: '2026-09-25',
    title: 'Maps, writing space, and a lighter look',
    bullets: [
      'Map Creator: upload your own map or pick a preset, then drop pins, labels, zones, and trails.',
      'Zones use one tool — pick the boundary when you place, then choose a style (icon and colour) in Properties. The name sits in the middle of the shape.',
      'Trails draw as smooth curves by default; switch to straight in Properties. Pins have a set of icon choices.',
      'Layers: delete is always visible. Story writing has a full-page focus mode.',
      'Light theme is the default, with optional whimsical motion in Settings. Event, faction, item, and location cards are easier to select, edit, and delete.',
      'Removed D&D / 5e / Wizards branding and the 5e SRD bestiary.',
    ],
  },
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

