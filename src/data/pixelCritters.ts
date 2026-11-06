/**
 * 16-bit style pixel companions that roam the window (rendered by <PixelCritters />).
 *
 * Each frame is a list of rows; one character per pixel, '.' is transparent and every other
 * character looks up a colour in the sprite's palette. Rows that are shorter than the sprite
 * width are padded with transparency so a stray typo never breaks the whole creature.
 */

export type CritterKind = 'flyer' | 'walker' | 'crawler';

export type CritterId =
  | 'fairy'
  | 'pixie'
  | 'sprite'
  | 'goblin'
  | 'wyvern'
  | 'dragon'
  | 'butterfly'
  | 'beetle'
  | 'snake'
  | 'alligator-bear'
  | 'crabacus'
  | 'emerald-wyvern'
  | 'void-walker'
  | 'goblin-priest'
  | 'fae-princess'
  | 'ragnok';

export type CritterGenre =
  | 'off'
  | 'fae-princess'
  | 'goblin-priest'
  | 'ragnok'
  | 'wilds'
  | 'alligator-bear'
  | 'crabacus'
  | 'emerald-wyvern'
  | 'void-walker';

export const CRITTER_GENRE_IDS: CritterGenre[] = [
  'off',
  'fae-princess',
  'goblin-priest',
  'ragnok',
  'wilds',
  'alligator-bear',
  'crabacus',
  'emerald-wyvern',
  'void-walker',
];

export function isCritterGenre(value: unknown): value is CritterGenre {
  return typeof value === 'string' && (CRITTER_GENRE_IDS as string[]).includes(value);
}

export interface CritterSprite {
  id: CritterId;
  name: string;
  kind: CritterKind;
  frames: string[][];
  palette: Record<string, string>;
  /** Screen pixels per sprite pixel. */
  scale: number;
  /** Seconds each animation frame is shown while moving. */
  frameTime: number;
  /** Travel speed in screen pixels per second. */
  speed: number;
  /** Colour of the little sparkle trail left while moving, if any. */
  trail?: string;
  /** Soft glow drawn behind the sprite, if any. */
  glow?: string;
  /** Flyers that mostly keep to the upper part of the window. */
  skyward?: boolean;
  /** Ground critters that leap between surfaces instead of sliding. */
  hops?: boolean;
  /** Occasional ember puff from the mouth (dragons). */
  breathesFire?: boolean;
  /**
   * Image-based companion (PNG/GIF atlas under /public). When set, `frames`/`palette` are unused
   * placeholders and PixelCritters loads the atlas instead.
   */
  imageAtlas?: boolean;
  /** Native atlas pixel size (square). Defaults to 32 for image companions. */
  atlasSize?: number;
  /** Lie-down / roar cycles (Alligator Bear). Walk-only atlases leave this unset. */
  atlasExtras?: boolean;
  /** Hidden until unlocked by a secret chord. */
  secret?: boolean;
}

const FAIRY: CritterSprite = {
  id: 'fairy',
  name: 'Fairy',
  kind: 'flyer',
  scale: 3,
  frameTime: 0.09,
  speed: 70,
  trail: '#fde68a',
  glow: 'rgba(253, 230, 138, 0.35)',
  palette: {
    o: '#3b2a4a',
    s: '#f8d3b0',
    h: '#f5c542',
    e: '#1a1a2e',
    g: '#34d399',
    G: '#059669',
    w: '#e0f7ff',
    W: '#7dd3fc',
  },
  frames: [
    [
      '................',
      '.....ooo........',
      '....ohhho.......',
      '...ohhhhho......',
      '...ohsesho......',
      '.wW.osssso.Ww...',
      'wWW..ogo..WWw...',
      'wWWW.oggo.WWWw..',
      '.wWWoggggoWWw...',
      '..WWoGggGoWW....',
      '....oGgggo......',
      '....oGGGGo......',
      '.....ogGo.......',
      '.....o..o.......',
      '....oo..oo......',
      '................',
    ],
    [
      '................',
      '.....ooo........',
      '....ohhho.......',
      '...ohhhhho......',
      '...ohsesho......',
      '....osssso......',
      '.....ogo........',
      '..wW.oggo.Ww....',
      '.wWWoggggoWWw...',
      '.wWWoGggGoWWw...',
      '..WWoGgggoWW....',
      '...WoGGGGoW.....',
      '.....ogGo.......',
      '.....o..o.......',
      '....oo..oo......',
      '................',
    ],
  ],
};

const PIXIE: CritterSprite = {
  id: 'pixie',
  name: 'Pixie',
  kind: 'flyer',
  scale: 3,
  frameTime: 0.07,
  speed: 95,
  trail: '#c4b5fd',
  glow: 'rgba(196, 181, 253, 0.35)',
  palette: {
    o: '#3b2a4a',
    s: '#f8d3b0',
    h: '#f472b6',
    e: '#1a1a2e',
    d: '#a78bfa',
    w: '#fde68a',
  },
  frames: [
    [
      '............',
      '....ooo.....',
      '...ohhho....',
      '...oseso....',
      '.ww.osso.ww.',
      'www.odo.www.',
      '.wwoddddoww.',
      '..woddddow..',
      '...oddddo...',
      '....oddo....',
      '....o..o....',
      '...oo..oo...',
    ],
    [
      '.ww......ww.',
      'www.ooo.www.',
      '.wwohhhoww..',
      '...oseso....',
      '....osso....',
      '....odo.....',
      '...oddddo...',
      '...oddddo...',
      '...oddddo...',
      '....oddo....',
      '....o..o....',
      '...oo..oo...',
    ],
  ],
};

const SPRITE: CritterSprite = {
  id: 'sprite',
  name: 'Wisp sprite',
  kind: 'flyer',
  scale: 3,
  frameTime: 0.12,
  speed: 55,
  trail: '#a7f3d0',
  glow: 'rgba(167, 243, 208, 0.4)',
  palette: {
    c: '#ffffff',
    m: '#a7f3d0',
    d: '#34d399',
  },
  frames: [
    [
      '..........',
      '....dd....',
      '...dmmd...',
      '..dmccmd..',
      '..dmccmd..',
      '...dmmd...',
      '....dd....',
      '...d......',
      '..d.......',
      '..........',
    ],
    [
      '..........',
      '...dmmd...',
      '..dmccmd..',
      '.dmccccmd.',
      '.dmccccmd.',
      '..dmccmd..',
      '...dmmd...',
      '.....d....',
      '......d...',
      '..........',
    ],
  ],
};

const GOBLIN: CritterSprite = {
  id: 'goblin',
  name: 'Goblin',
  kind: 'walker',
  scale: 3,
  frameTime: 0.16,
  speed: 48,
  hops: true,
  palette: {
    o: '#1f1a2e',
    g: '#6abf4b',
    G: '#3f8a2e',
    y: '#fde047',
    e: '#ef4444',
    t: '#f5f5f4',
    r: '#8b5a2b',
    R: '#5c3a1a',
    k: '#4a3b2a',
  },
  frames: [
    [
      '................',
      '...o.......o....',
      '..oGo.....oGo...',
      '..oGgoooooogGo..',
      '...ogggggggggo..',
      '...ogyegggyego..',
      '...oggggggggo...',
      '....ogttttgo....',
      '.....oggggo.....',
      '....oorrrroo....',
      '...ogorRRrogo...',
      '...o.orrrro.o...',
      '.....okkkko.....',
      '.....oG.oGo.....',
      '....oGo..oGo....',
      '....ooo..ooo....',
    ],
    [
      '................',
      '................',
      '...o.......o....',
      '..oGo.....oGo...',
      '..oGgoooooogGo..',
      '...ogggggggggo..',
      '...ogyegggyego..',
      '...oggggggggo...',
      '....ogttttgo....',
      '.....oggggo.....',
      '....oorrrroo....',
      '...ogorRRrogo...',
      '...o.orrrro.o...',
      '.....okkkko.....',
      '....oGo..oGo....',
      '...ooo....ooo...',
    ],
  ],
};

const WYVERN: CritterSprite = {
  id: 'wyvern',
  name: 'Wyvern',
  kind: 'flyer',
  scale: 3,
  frameTime: 0.18,
  speed: 85,
  skyward: true,
  palette: {
    o: '#1e1b2e',
    b: '#0f766e',
    B: '#14b8a6',
    w: '#0e7490',
    W: '#22d3ee',
    e: '#fde047',
    h: '#e5e7eb',
  },
  frames: [
    [
      '........................',
      '..........WW............',
      '.........WWWW...........',
      '........WWWwWW..........',
      '.......WWwwwwWW.........',
      '......oWwwwwwwWo........',
      '.....oBbbbbbbbbo.oh.....',
      '....oBbbbbbbbbbooBbo....',
      '...oBbbbbbbbbbbbBbeBo...',
      '..oBbbbbbbbbbbbbbboooo..',
      '.oBbo.oBbbbbbbbbo.......',
      'oBo....obbbbbbo.........',
      'oo......ob..bo..........',
      '.........o..o...........',
      '........oo..oo..........',
      '........................',
    ],
    [
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '.......oooooooo..oh.....',
      '......oBbbbbbbbbooBbo...',
      '.....oBbbbbbbbbbbBbeBo..',
      '....oBbbbbbbbbbbbbboooo.',
      '...oBbo.oWwwwwwwWo......',
      '..oBo....oWwwwwwWo......',
      '.oBo......oWwwwWo.......',
      '.oo........oWwWo........',
      '............oWo.........',
      '.............o..........',
      '........................',
    ],
  ],
};

const DRAGON: CritterSprite = {
  id: 'dragon',
  name: 'Dragon',
  kind: 'flyer',
  scale: 3,
  frameTime: 0.2,
  speed: 65,
  skyward: true,
  breathesFire: true,
  palette: {
    o: '#2a0a0a',
    b: '#b91c1c',
    B: '#ef4444',
    w: '#7f1d1d',
    W: '#dc2626',
    e: '#fde047',
    h: '#f5f5f4',
  },
  frames: [
    [
      '.........WWW............',
      '........WWwWW...........',
      '.......WWwwwWW..........',
      '......WWwwwwwWW.........',
      '.....oWwwwwwwwWo........',
      '....oBbbbbbbbbbbo.hh....',
      '...oBbbbbbbbbbbbboBbho..',
      '..oBbbbbbbbbbbbbbBbeBBo.',
      '.oBbo.oBbbbbbbbbbbBooooo',
      'oBo....oBbbbbbbbbbo.....',
      'oo......obbbbbbbbo......',
      '.........ob.ob.bo.......',
      '.........o..o..o........',
      '........oo.oo.oo........',
      '........................',
      '........................',
    ],
    [
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '....oooooooooooo..hh....',
      '...oBbbbbbbbbbbbboBbho..',
      '..oBbbbbbbbbbbbbbBbeBBo.',
      '.oBbo.oBbbbbbbbbbbBooooo',
      'oBo....oWwwwwwwwwbo.....',
      'oo......oWwwwwwwWo......',
      '.........oWwwwwWo.......',
      '..........oWwwWo........',
      '...........oWWo.........',
      '............oo..........',
      '........................',
    ],
  ],
};

const BUTTERFLY: CritterSprite = {
  id: 'butterfly',
  name: 'Butterfly',
  kind: 'flyer',
  scale: 3,
  frameTime: 0.1,
  speed: 50,
  palette: {
    o: '#3b2a4a',
    p: '#f472b6',
    P: '#be185d',
    y: '#fde047',
  },
  frames: [
    [
      '.o........o.',
      '..o..oo..o..',
      '.pPp.oo.pPp.',
      'pPyPpoopPyPp',
      'pPPPpoopPPPp',
      '.pPPpoopPPp.',
      '..ppPooPpp..',
      '...pPooPp...',
      '....p..p....',
      '............',
    ],
    [
      '...o....o...',
      '....o..o....',
      '....PooP....',
      '...pyooyp...',
      '...pPooPp...',
      '...pPooPp...',
      '....PooP....',
      '....pooP....',
      '.....oo.....',
      '............',
    ],
  ],
};

const BEETLE: CritterSprite = {
  id: 'beetle',
  name: 'Beetle',
  kind: 'crawler',
  scale: 3,
  frameTime: 0.14,
  speed: 30,
  palette: {
    o: '#111827',
    s: '#1d4ed8',
    S: '#3b82f6',
    e: '#fbbf24',
  },
  frames: [
    [
      '............',
      '...oSSSSo...',
      '..oSsssSSo..',
      '.ooSsssssoo.',
      'o.oSsssssoe.',
      '..osssssso..',
      '.o.o.oo.o.o.',
      '............',
    ],
    [
      '............',
      '...oSSSSo...',
      '..oSsssSSo..',
      '.ooSsssssoo.',
      '..oSsssssoe.',
      'o.osssssso..',
      '..o.o.o.o..o',
      '............',
    ],
  ],
};

const SNAKE: CritterSprite = {
  id: 'snake',
  name: 'Snake',
  kind: 'crawler',
  scale: 3,
  frameTime: 0.22,
  speed: 36,
  palette: {
    o: '#052e16',
    g: '#16a34a',
    G: '#4ade80',
    e: '#ef4444',
    t: '#ef4444',
  },
  frames: [
    [
      '....................',
      '..............oooo..',
      '.............oGgeo.t',
      '....oooo....oGggoo.t',
      '...oGggGo..oGggo....',
      '..oGg.oGgooGgo......',
      '.oGo...oGggGo.......',
      '.oo.....oooo........',
    ],
    [
      '....................',
      '..............oooo..',
      '.............oGgeo..',
      '..oooo......oGggoo..',
      '.oGggGo....oGggo....',
      'oGg.oGgoooGgo.......',
      'oo...oGgggGo........',
      '......oooo..........',
    ],
  ],
};

/** Sultan of Scales — PNG/GIF atlas companion (internal id: alligator-bear). */
const ALLIGATOR_BEAR: CritterSprite = {
  id: 'alligator-bear',
  name: 'Sultan of Scales',
  kind: 'walker',
  scale: 3,
  frameTime: 0.2, // matches walk-south.gif frame delay
  speed: 42,
  hops: true,
  imageAtlas: true,
  atlasSize: 32,
  atlasExtras: true,
  // Unused for image companions — kept so the ASCII renderer path stays typed.
  palette: {},
  frames: [['.']],
};

/** Crabacus — Crab King of the tidepools; walk-cycle GIF atlas companion. */
const CRABACUS: CritterSprite = {
  id: 'crabacus',
  name: 'Crabacus',
  kind: 'walker',
  scale: 2,
  frameTime: 0.2, // matches walk GIF frame delay
  speed: 36,
  hops: false,
  imageAtlas: true,
  atlasSize: 64,
  // Unused for image companions — kept so the ASCII renderer path stays typed.
  palette: {},
  frames: [['.']],
};

/** Emerald Wyvern — ground-crawling python-wyvern; PNG frame atlas. */
const EMERALD_WYVERN: CritterSprite = {
  id: 'emerald-wyvern',
  name: 'Emerald Wyvern',
  kind: 'walker',
  scale: 2,
  frameTime: 0.12,
  speed: 40,
  hops: false,
  imageAtlas: true,
  atlasSize: 104,
  palette: {},
  frames: [['.']],
};

/** The Void Walker — human warrior atlas; walk + sword-draw flourish. */
const VOID_WALKER: CritterSprite = {
  id: 'void-walker',
  name: 'The Void Walker',
  kind: 'walker',
  scale: 2,
  frameTime: 0.12,
  speed: 38,
  hops: false,
  imageAtlas: true,
  atlasSize: 68,
  palette: {},
  frames: [['.']],
};

/** Goblin Warrior Priest — fight-idle / kick / mask atlas. */
const GOBLIN_PRIEST: CritterSprite = {
  id: 'goblin-priest',
  name: 'Goblin Warrior Priest',
  kind: 'walker',
  scale: 2,
  frameTime: 0.12,
  speed: 46,
  hops: true,
  imageAtlas: true,
  atlasSize: 64,
  palette: {},
  frames: [['.']],
};

/** Fae Princess — launch → fly, with a south-facing kiss. */
const FAE_PRINCESS: CritterSprite = {
  id: 'fae-princess',
  name: 'Fae Princess',
  kind: 'flyer',
  scale: 2,
  frameTime: 0.08,
  speed: 72,
  hops: false,
  imageAtlas: true,
  atlasSize: 68,
  trail: '#f9a8d4',
  glow: 'rgba(249, 168, 212, 0.3)',
  palette: {},
  frames: [['.']],
};

/** Ragnok the Hoarder — walk / idle + orange flame burst. */
const RAGNOK: CritterSprite = {
  id: 'ragnok',
  name: 'Ragnok the Hoarder',
  kind: 'walker',
  scale: 2,
  frameTime: 0.12,
  speed: 40,
  hops: false,
  imageAtlas: true,
  atlasSize: 68,
  trail: '#fb923c',
  glow: 'rgba(251, 146, 60, 0.28)',
  palette: {},
  frames: [['.']],
};

export const CRITTERS: Record<CritterId, CritterSprite> = {
  fairy: FAIRY,
  pixie: PIXIE,
  sprite: SPRITE,
  goblin: GOBLIN,
  wyvern: WYVERN,
  dragon: DRAGON,
  butterfly: BUTTERFLY,
  beetle: BEETLE,
  snake: SNAKE,
  'alligator-bear': ALLIGATOR_BEAR,
  crabacus: CRABACUS,
  'emerald-wyvern': EMERALD_WYVERN,
  'void-walker': VOID_WALKER,
  'goblin-priest': GOBLIN_PRIEST,
  'fae-princess': FAE_PRINCESS,
  ragnok: RAGNOK,
};

export interface CritterGenreInfo {
  id: CritterGenre;
  label: string;
  description: string;
  /** Which creatures spawn; the first entries are preferred when the cast is small. */
  cast: CritterId[];
  /** How many creatures roam at once. */
  count: number;
}

export const CRITTER_GENRES: CritterGenreInfo[] = [
  {
    id: 'off',
    label: 'No companions',
    description: 'Only the drifting motes. Nothing else wanders the window.',
    cast: [],
    count: 0,
  },
  {
    id: 'fae-princess',
    label: 'Fae Princess',
    description:
      'A winged fae princess who launches into each new heading, flutters on the breeze, blows kisses as she drifts south, and gathers a glowing aura when she perches.',
    cast: ['fae-princess'],
    count: 1,
  },
  {
    id: 'goblin-priest',
    label: 'Goblin Warrior Priest',
    description:
      'A masked green goblin priest of war — he prowls in a fight stance, lashes out with a roundhouse, or tears the mask away before vanishing back into a run.',
    cast: ['goblin-priest'],
    count: 1,
  },
  {
    id: 'ragnok',
    label: 'Ragnok the Hoarder',
    description:
      'A squat dragon-hoarder who patrols your pages for shiny things — and when the stash feels threatened, he ignites a burst of bright orange flame.',
    cast: ['ragnok'],
    count: 1,
  },
  {
    id: 'wilds',
    label: 'Wild meadow',
    description: 'Butterflies drift, a beetle trundles, and a snake slithers along the ledges.',
    cast: ['butterfly', 'snake', 'beetle', 'butterfly'],
    count: 4,
  },
  {
    id: 'alligator-bear',
    label: 'Sultan of Scales',
    description:
      'Sultan of Scales — an albino alligator with the bulk of a bear, armored in black iron and crowned in swamp-thorn. He ruled the drowned fens until the mists swallowed his throne; now he prowls your pages, a restless sovereign looking for a realm worth claiming again.',
    cast: ['alligator-bear'],
    count: 1,
  },
  {
    id: 'crabacus',
    label: 'Crabacus',
    description:
      'Crab King of the tidepools — clawed sovereign of salt and shell. He patrols your pages sideways and forward alike, clicking for a court that never quite arrives.',
    cast: ['crabacus'],
    count: 1,
  },
  {
    id: 'emerald-wyvern',
    label: 'Emerald Wyvern',
    description:
      'A low-slung emerald wyvern with a python’s body and a viper’s head — wing-knuckles scrape the ground as it prowls your pages, jade scales catching every mote of light.',
    cast: ['emerald-wyvern'],
    count: 1,
  },
  {
    id: 'void-walker',
    label: 'The Void Walker',
    description:
      'A human warrior who crossed the veil and never fully returned — steel and shadow in equal measure. He paces your pages, and when the quiet grows too long he draws his sword from nowhere.',
    cast: ['void-walker'],
    count: 1,
  },
];

/** Companion genre cards shown in Settings (includes atlas companions). */
export function visibleCritterGenres(_unlockedSecrets = true): CritterGenreInfo[] {
  return CRITTER_GENRES;
}

export function getCritterGenre(id: CritterGenre): CritterGenreInfo {
  return CRITTER_GENRES.find((g) => g.id === id) ?? CRITTER_GENRES[0]!;
}

/** Width and height of a sprite in sprite pixels (frames are padded to the widest row). */
export function spriteSize(sprite: CritterSprite): { w: number; h: number } {
  if (sprite.imageAtlas) {
    const n = sprite.atlasSize ?? 32;
    return { w: n, h: n };
  }
  let w = 0;
  let h = 0;
  for (const frame of sprite.frames) {
    h = Math.max(h, frame.length);
    for (const row of frame) w = Math.max(w, row.length);
  }
  return { w, h };
}

/**
 * Paint one frame onto a canvas at the sprite's scale. Flipped frames face left.
 * Returns null when canvases are unavailable (server rendering, tests).
 */
export function renderSpriteFrame(
  sprite: CritterSprite,
  frameIndex: number,
  flip = false,
): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const { w, h } = spriteSize(sprite);
  const canvas = document.createElement('canvas');
  canvas.width = w * sprite.scale;
  canvas.height = h * sprite.scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  const frame = sprite.frames[frameIndex] ?? sprite.frames[0] ?? [];
  for (let y = 0; y < frame.length; y++) {
    const row = frame[y] ?? '';
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (!ch || ch === '.' || ch === ' ') continue;
      const color = sprite.palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      const px = flip ? w - 1 - x : x;
      ctx.fillRect(px * sprite.scale, y * sprite.scale, sprite.scale, sprite.scale);
    }
  }
  return canvas;
}
