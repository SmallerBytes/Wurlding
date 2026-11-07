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
    version: '0.1.31',
    date: '2026-11-07',
    title: 'Custom companion walk mapping and more wallpapers',
    bullets: [
      'PixelLab imports now recognize stride/step/run-style walk cycles (not only “moving” / “walk” names).',
      'Clearer Add-your-own guidance for which animation names map to idle, walk, and flourishes.',
      'New companion desktop backgrounds: desert trail, reef with sunlit arch, and sunset above the clouds.',
    ],
  },
  {
    version: '0.1.30',
    date: '2026-11-07',
    title: 'Companions page and PixelLab custom uploads',
    bullets: [
      'Companions moved out of Settings into their own sidebar page.',
      'Per-companion size sliders (50%–200%) for selected creatures.',
      'Upload your own PixelLab.ai export folders — walk/idle roam, with one optional pause flourish.',
    ],
  },
  {
    version: '0.1.29',
    date: '2026-11-07',
    title: 'Ghostfreak scale polish and Goblin free-roam fix',
    bullets: [
      'Ghostfreak draw scales tuned for walk, idle, and void/sink (with a lighter SE/SW walk).',
      'Ghostfreak never uses rotations stills — only walk, idle, void, and sink.',
      'Goblin Warrior Priest no longer freezes after a short free-roam; longer idle pauses so flourishes can play.',
    ],
  },
  {
    version: '0.1.28',
    date: '2026-11-07',
    title: 'Multi companions, desktop roam, and wallpapers',
    bullets: [
      'Select up to five companions at once.',
      'Goblin Warrior Priest and Sultan of Scales free-roam the whole desktop when added to screen.',
      'New companion desktop backgrounds to preview and download: forest stream clearing and sunlit woodland clearing.',
    ],
  },
  {
    version: '0.1.27',
    date: '2026-11-07',
    title: 'Mew to-bubble frames in installed builds',
    bullets: [
      'Installed app now plays mew_to_bubble when rolling from south idle into the bubble (was localhost-only).',
      'Companion PNG frames are unpacked from the asar so Electron can decode the morph reliably.',
    ],
  },
  {
    version: '0.1.26',
    date: '2026-11-07',
    title: 'Mew bubble burst sequence fix',
    bullets: [
      'Mew now finishes the full cycle: moving bubble → face south → bubble burst → south idle.',
      'Bubble exit can no longer skip the pop; still never uses mew_in_a_ball/rotations.',
    ],
  },
  {
    version: '0.1.25',
    date: '2026-11-07',
    title: 'Update notes scrollbar and companion fixes',
    bullets: [
      'Settings → Updates log scrolls inside a fixed-height panel so it no longer stretches the page.',
      'Mew to-bubble morph plays through its frames instead of freezing, then jumping into the bubble.',
      'Mew flourish lock and aspect-correct drawing so enter-bubble / sink / pop stay readable.',
    ],
  },
  {
    version: '0.1.24',
    date: '2026-11-07',
    title: 'Companion changes',
    bullets: [
      'Companion changes — Sink_downward_while_pulling_knees_toward_the_chest.',
    ],
  },
  {
    version: '0.1.23',
    date: '2026-11-07',
    title: 'Notes UI changes and more companion updates',
    bullets: [
      'Notes UI changes and more companion updates.',
    ],
  },
  {
    version: '0.1.22',
    date: '2026-11-07',
    title: 'New companion added',
    bullets: [
      'New companion added.',
    ],
  },
  {
    version: '0.1.21',
    date: '2026-11-06',
    title: 'Updates to companions',
    bullets: [
      'Updates to companions.',
    ],
  },
  {
    version: '0.1.20',
    date: '2026-11-06',
    title: 'Update to companion models',
    bullets: [
      'Update to companion models.',
    ],
  },
  {
    version: '0.1.18',
    date: '2026-11-06',
    title: 'Ghostfreak and desktop companions',
    bullets: [
      'New companion: Ghostfreak — drifts across the floor, opens a dark void, or sinks out of sight.',
      'Add to screen: keep your selected companion roaming the desktop even while Wurlding is minimized.',
    ],
  },
  {
    version: '0.1.17',
    date: '2026-11-06',
    title: 'More companions: Necromage, Golem, Victfur, Iron Giant',
    bullets: [
      'New companions: Necromage, The Golem, Victfur, and The Iron Giant (with an eye-flash flourish).',
      'Companion picker copy no longer calls them 16-bit or “genres.”',
      'Golem and Victfur flourish sizing polish.',
    ],
  },
  {
    version: '0.1.16',
    date: '2026-11-06',
    title: 'Ragnok flame burst reliability',
    bullets: [
      'Ragnok’s flame flourish now plays through the full frame cycle instead of cutting out early.',
      'Fixed intermittent vanishing during some flame bursts when atlas frames failed to resolve.',
    ],
  },
  {
    version: '0.1.15',
    date: '2026-11-06',
    title: 'Fae Princess sky roam, tighter cards, and app icon',
    bullets: [
      'Fae Princess no longer snaps onto cards or orbits — smooth sky roaming only, with midair hover for her aura.',
      'Companion cards in Settings use one short sentence each so the grid stays compact.',
      'Windows builds use the Wurlding icon PNG from the build folder for the app and installer.',
    ],
  },
  {
    version: '0.1.14',
    date: '2026-11-06',
    title: 'Fae Princess, Goblin Warrior Priest, and Ragnok',
    bullets: [
      'Fae Princess replaces the Fae Court — launch into each heading, flutter on the breeze, blow a kiss south, and gather a glowing aura when perched.',
      'Goblin Warrior Priest replaces the Goblin warren — fight-idle prowls, roundhouse kicks, and a mask flourish.',
      'New companion: Ragnok the Hoarder — walks your pages and ignites bright orange flame when the stash feels threatened.',
      'Void Walker sword flourish now plays facing south after a short idle beat.',
    ],
  },
  {
    version: '0.1.13',
    date: '2026-11-05',
    title: 'Emerald Wyvern idle polish',
    bullets: [
      'Emerald Wyvern no longer plays the fire-breath flourish while idling — walk and breathe-idle only for now.',
    ],
  },
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
      'Casts include Fae Princess, Dragon’s roost, Goblin Warrior Priest, Wild meadow, and a full menagerie.',
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

