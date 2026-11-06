/**
 * Secret Alligator Bear companion — unlocked with Ctrl+Shift+A+B.
 * Still PNGs live in /public/critters/alligator-bear/{pose}/{facing}.png
 * Animated GIFs (when available) live in /public/critters/alligator-bear/anim/{pose}-{facing}.gif
 */

import { parseGIF, decompressFrames } from 'gifuct-js';

export type BearFacing =
  | 'south'
  | 'south-east'
  | 'east'
  | 'north-east'
  | 'north'
  | 'north-west'
  | 'west'
  | 'south-west';

/** sleep = lie-down; sleep-idle = held still; wake = get-up; jump = hop between perches. */
export type BearPose =
  | 'idle'
  | 'walk'
  | 'jump'
  | 'sleep'
  | 'sleep-idle'
  | 'wake'
  | 'roar'
  | 'kick'
  | 'mask'
  | 'launch'
  | 'kiss'
  | 'aura';

export const BEAR_FACINGS: BearFacing[] = [
  'south',
  'south-east',
  'east',
  'north-east',
  'north',
  'north-west',
  'west',
  'south-west',
];

export const BEAR_POSES: BearPose[] = ['idle', 'walk', 'jump', 'sleep', 'sleep-idle', 'wake', 'roar'];

/** Facings that have lie-down / wake sleep GIFs. */
export const BEAR_SLEEP_GIF_FACINGS: BearFacing[] = [
  'south',
  'south-east',
  'south-west',
  'east',
  'west',
];

/** Facings that have a roar GIF (north still missing). */
export const BEAR_ROAR_GIF_FACINGS: BearFacing[] = [
  'south',
  'south-east',
  'south-west',
  'east',
  'west',
  'north-east',
  'north-west',
];

/** Pose+facing pairs that have a multi-frame GIF in /anim. */
const BEAR_ANIM_GIFS: Array<{ pose: BearPose; facing: BearFacing }> = [
  ...(['walk', 'idle', 'jump'] as const).flatMap((pose) =>
    BEAR_FACINGS.map((facing) => ({ pose, facing })),
  ),
  ...BEAR_SLEEP_GIF_FACINGS.map((facing) => ({ pose: 'sleep' as const, facing })),
  ...BEAR_SLEEP_GIF_FACINGS.map((facing) => ({ pose: 'wake' as const, facing })),
  ...BEAR_ROAR_GIF_FACINGS.map((facing) => ({ pose: 'roar' as const, facing })),
];

export const ALLIGATOR_BEAR_UNLOCK_KEY = 'wurlding:alligatorBearUnlocked';
export const ALLIGATOR_BEAR_UNLOCK_EVENT = 'wurlding:alligator-bear-unlocked';

/** Native pixel size of each still PNG. */
export const ALLIGATOR_BEAR_SIZE = 32;
/** On-screen scale (32 × 3 = 96px). GIFs scale into the same box. */
export const ALLIGATOR_BEAR_SCALE = 3;
/** Default seconds per animation frame (matches the walk GIF's 200ms delay). */
export const ALLIGATOR_BEAR_FRAME_TIME = 0.2;
/** How long he holds the sleeping still after the lie-down GIF finishes. */
export const ALLIGATOR_BEAR_SLEEP_HOLD = 15;
/** Bump when atlas contents change so PixelCritters remounts and re-preloads. */
export const ALLIGATOR_BEAR_ATLAS_REV = 10;

export function bearSpriteUrl(pose: BearPose, facing: BearFacing): string {
  const base = import.meta.env.BASE_URL || '/';
  // sleep-idle stills live alongside the old sleep PNGs.
  const folder = pose === 'sleep-idle' ? 'sleep' : pose;
  return `${base}critters/alligator-bear/${folder}/${facing}.png`;
}

export function bearAnimUrl(pose: BearPose, facing: BearFacing): string {
  const base = import.meta.env.BASE_URL || '/';
  return `${base}critters/alligator-bear/anim/${pose}-${facing}.gif`;
}

/** Snap to a facing that has a sleep lie-down GIF. */
export function sleepGifFacing(facing: BearFacing): BearFacing {
  if (BEAR_SLEEP_GIF_FACINGS.includes(facing)) return facing;
  switch (facing) {
    case 'north':
      return 'south';
    case 'north-east':
      return 'south-east';
    case 'north-west':
      return 'south-west';
    default:
      return 'south';
  }
}

/** Snap to a facing that has a roar GIF. */
export function roarGifFacing(facing: BearFacing): BearFacing {
  if (BEAR_ROAR_GIF_FACINGS.includes(facing)) return facing;
  // North is the only missing roar direction — use south.
  if (facing === 'north') return 'south';
  return 'south';
}

export function isAlligatorBearUnlocked(): boolean {
  try {
    return localStorage.getItem(ALLIGATOR_BEAR_UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
}

/** Persist the unlock and notify the app. Returns true the first time it unlocks. */
export function unlockAlligatorBear(): boolean {
  const already = isAlligatorBearUnlocked();
  try {
    localStorage.setItem(ALLIGATOR_BEAR_UNLOCK_KEY, '1');
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent(ALLIGATOR_BEAR_UNLOCK_EVENT, { detail: { first: !already } }));
  return !already;
}

/**
 * Map a movement vector to one of eight facings.
 * Screen coords: +x right, +y down.
 */
export function facingFromDelta(dx: number, dy: number): BearFacing {
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return 'south';
  const angle = Math.atan2(dy, dx); // −π…π, 0 = east
  const step = Math.PI / 4;
  const idx = Math.round(angle / step);
  switch (idx) {
    case 0:
      return 'east';
    case 1:
      return 'south-east';
    case 2:
      return 'south';
    case 3:
      return 'south-west';
    case 4:
    case -4:
      return 'west';
    case -3:
      return 'north-west';
    case -2:
      return 'north';
    case -1:
      return 'north-east';
    default:
      return 'south';
  }
}

const stillCache = new Map<string, HTMLCanvasElement>();
const animCache = new Map<string, HTMLCanvasElement[]>();
const sleepSizeCache = new Map<BearFacing, { w: number; h: number }>();
/** Opaque content box of the final lie-down GIF frame — used to size the sleep still. */
const sleepLastBoundsCache = new Map<
  BearFacing,
  { minX: number; minY: number; maxX: number; maxY: number; w: number; h: number }
>();

function contentBounds(canvas: HTMLCanvasElement): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  w: number;
  h: number;
} | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * 4 + 3]!;
      if (a > 10) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) return null;
  return { minX, minY, maxX, maxY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

export async function loadBearFrame(pose: BearPose, facing: BearFacing): Promise<HTMLCanvasElement | null> {
  const key = `${pose}:${facing}`;
  const cached = stillCache.get(key);
  if (cached) return cached;
  if (typeof document === 'undefined') return null;

  const img = new Image();
  img.src = bearSpriteUrl(pose, facing);
  try {
    await img.decode();
  } catch {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || ALLIGATOR_BEAR_SIZE;
  canvas.height = img.naturalHeight || ALLIGATOR_BEAR_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);
  // PNGs already carry alpha — do not punch near-black (that was eating outlines).
  stillCache.set(key, canvas);
  return canvas;
}

/** Decode an animated GIF into canvases (one per frame). */
export async function loadBearAnim(pose: BearPose, facing: BearFacing): Promise<HTMLCanvasElement[] | null> {
  const key = `${pose}:${facing}`;
  const cached = animCache.get(key);
  if (cached) return cached;
  if (typeof document === 'undefined') return null;

  let buffer: ArrayBuffer;
  try {
    const res = await fetch(bearAnimUrl(pose, facing));
    if (!res.ok) return null;
    buffer = await res.arrayBuffer();
  } catch {
    return null;
  }

  try {
    const gif = parseGIF(buffer);
    const frames = decompressFrames(gif, true);
    if (!frames.length) return null;

    const width = gif.lsd?.width || frames[0]!.dims.width;
    const height = gif.lsd?.height || frames[0]!.dims.height;
    if (pose === 'sleep') sleepSizeCache.set(facing, { w: width, h: height });

    const out: HTMLCanvasElement[] = [];

    const stage = document.createElement('canvas');
    stage.width = width;
    stage.height = height;
    const stageCtx = stage.getContext('2d');
    if (!stageCtx) return null;
    stageCtx.imageSmoothingEnabled = false;

    for (const frame of frames) {
      const { left, top, width: fw, height: fh } = frame.dims;
      // Disposal 2 = restore to background after this frame is shown.
      const disposal = frame.disposalType;
      const patch = new ImageData(new Uint8ClampedArray(frame.patch), fw, fh);
      // putImageData ignores the current composite — draw via a temp canvas so alpha blends.
      const patchCanvas = document.createElement('canvas');
      patchCanvas.width = fw;
      patchCanvas.height = fh;
      const patchCtx = patchCanvas.getContext('2d');
      if (!patchCtx) continue;
      patchCtx.putImageData(patch, 0, 0);
      stageCtx.drawImage(patchCanvas, left, top);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(stage, 0, 0);
      // GIFs already use chroma transparency — keep near-black outline ink.
      out.push(canvas);

      if (disposal === 2) {
        stageCtx.clearRect(left, top, fw, fh);
      }
    }

    if (!out.length) return null;
    if (pose === 'sleep') {
      const last = out[out.length - 1]!;
      const bounds = contentBounds(last);
      if (bounds) sleepLastBoundsCache.set(facing, bounds);
    }
    animCache.set(key, out);
    return out;
  } catch {
    return null;
  }
}

/**
 * On-screen size of the sleep hold vs a normal companion draw (1 = full size).
 * 0.6 = 40% smaller than the original full-size pose.
 */
/** Sleep hold draw size relative to the companion box. */
export const SLEEP_IDLE_DRAW_SCALE = 1.2;

/**
 * Sleep hold still — last frame of the lie-down GIF (not the 32×32 sleep PNG,
 * which crops snout/tail). On-screen size uses SLEEP_IDLE_DRAW_SCALE.
 */
export async function loadSleepIdleFrame(facing: BearFacing): Promise<HTMLCanvasElement | null> {
  const key = `sleep-idle:${facing}:v10`;
  const cached = stillCache.get(key);
  if (cached) return cached;

  const gifFacing = sleepGifFacing(facing);
  const anim = await loadBearAnim('sleep', gifFacing);
  if (anim && anim.length > 0) {
    const last = anim[anim.length - 1]!;
    stillCache.set(key, last);
    return last;
  }

  // Fallback only if the sleep GIF is missing.
  const frame = await loadBearFrame('sleep-idle', facing);
  if (!frame) {
    if (facing !== gifFacing) return loadSleepIdleFrame(gifFacing);
    return null;
  }
  stillCache.set(key, frame);
  return frame;
}

/**
 * Frame list for a pose/facing: animated GIF frames when present, otherwise the still PNG.
 */
export async function loadBearFrames(pose: BearPose, facing: BearFacing): Promise<HTMLCanvasElement[]> {
  if (pose === 'sleep-idle') {
    const still = await loadSleepIdleFrame(facing);
    return still ? [still] : [];
  }
  const anim = await loadBearAnim(pose, facing);
  if (anim && anim.length > 0) return anim;
  const still = await loadBearFrame(pose, facing);
  return still ? [still] : [];
}

export async function preloadAlligatorBear(): Promise<Map<string, HTMLCanvasElement[]>> {
  const map = new Map<string, HTMLCanvasElement[]>();
  await Promise.all(
    BEAR_ANIM_GIFS.map(async ({ pose, facing }) => {
      const frames = await loadBearFrames(pose, facing);
      if (frames.length) map.set(`${pose}:${facing}`, frames);
    }),
  );
  // Sleeping hold stills for every rotation that has a PNG (scaled to GIF size).
  await Promise.all(
    BEAR_FACINGS.map(async (facing) => {
      const frames = await loadBearFrames('sleep-idle', facing);
      if (frames.length) map.set(`sleep-idle:${facing}`, frames);
    }),
  );
  return map;
}
