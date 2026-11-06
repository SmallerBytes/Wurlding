/**
 * Emerald Wyvern companion — PNG frame-sequence atlas.
 * Frames live in /public/critters/emerald-wyvern/{walk|idle}/…
 *
 * Source exports use inconsistent canvas sizes (south is tight 48×48;
 * east/west are long and short). We normalize every sequence so body
 * *height* matches; the atlas is wide enough that side views aren't
 * width-clamped back down.
 */

import { facingFromDelta, type BearFacing } from './alligatorBear';

export type WyvernFacing = BearFacing;
export type WyvernPose = 'idle' | 'walk';

export const WYVERN_FACINGS: WyvernFacing[] = [
  'south',
  'south-east',
  'east',
  'north-east',
  'north',
  'north-west',
  'west',
  'south-west',
];

export { facingFromDelta };

/** Wide enough for east/west idle (~54×26) at TARGET_HEIGHT without clamping. */
export const EMERALD_WYVERN_SIZE = 104;
export const EMERALD_WYVERN_SCALE = 2;
export const EMERALD_WYVERN_FRAME_TIME = 0.12;
export const EMERALD_WYVERN_ATLAS_REV = 18;

const WALK_FRAME_COUNT = 8;
const IDLE_FRAME_COUNT = 15;
/** Shared body height across facings (south walk content is ~32px tall). */
const TARGET_HEIGHT = 48;
const ALPHA_CUTOFF = 8;
/** Rear / rear-diagonal views read skinny — bump to match south and side walks. */
const FACING_SCALE_BOOST: Partial<Record<WyvernFacing, number>> = {
  north: 1.22,
  'north-east': 1.28,
  'north-west': 1.28,
  // SE/SW were overshooting after the shared diagonal bump.
  'south-east': 1.06,
  'south-west': 1.06,
};

type Bounds = { x: number; y: number; w: number; h: number };

function frameUrl(pose: 'walk' | 'idle', facing: WyvernFacing, index: number): string {
  const base = import.meta.env.BASE_URL || '/';
  const n = String(index).padStart(3, '0');
  return `${base}critters/emerald-wyvern/${pose}/${facing}/frame_${n}.png`;
}

const animCache = new Map<string, HTMLCanvasElement[]>();

function contentBounds(canvas: HTMLCanvasElement): Bounds | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const { width, height } = canvas;
  const { data } = ctx.getImageData(0, 0, width, height);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3]! > ALPHA_CUTOFF) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** Trim + height-match into a fixed box; shared scale keeps a cycle from bobbing. */
function normalizeSequence(frames: HTMLCanvasElement[], facing: WyvernFacing): HTMLCanvasElement[] {
  const bounds = frames.map(contentBounds);
  let maxH = 1;
  let maxW = 1;
  for (const b of bounds) {
    if (!b) continue;
    maxH = Math.max(maxH, b.h);
    maxW = Math.max(maxW, b.w);
  }
  // Match height first. Only shrink if a frame is somehow wider than the atlas.
  let scale = (TARGET_HEIGHT / maxH) * (FACING_SCALE_BOOST[facing] ?? 1);
  if (maxW * scale > EMERALD_WYVERN_SIZE) {
    scale = EMERALD_WYVERN_SIZE / maxW;
  }
  if (maxH * scale > EMERALD_WYVERN_SIZE) {
    scale = EMERALD_WYVERN_SIZE / maxH;
  }

  return frames.map((src, i) => {
    const out = document.createElement('canvas');
    out.width = EMERALD_WYVERN_SIZE;
    out.height = EMERALD_WYVERN_SIZE;
    const ctx = out.getContext('2d');
    if (!ctx) return out;
    ctx.imageSmoothingEnabled = false;

    const b = bounds[i];
    if (!b) return out;

    const dw = Math.max(1, Math.round(b.w * scale));
    const dh = Math.max(1, Math.round(b.h * scale));
    const dx = Math.floor((EMERALD_WYVERN_SIZE - dw) / 2);
    const dy = EMERALD_WYVERN_SIZE - dh; // feet on the bottom edge
    ctx.drawImage(src, b.x, b.y, b.w, b.h, dx, dy, dw, dh);
    return out;
  });
}

async function loadPng(url: string): Promise<HTMLCanvasElement | null> {
  if (typeof document === 'undefined') return null;
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } catch {
    return null;
  }
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || EMERALD_WYVERN_SIZE;
  canvas.height = img.naturalHeight || EMERALD_WYVERN_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);
  return canvas;
}

async function loadFrameSequence(
  pose: 'walk' | 'idle',
  facing: WyvernFacing,
  count: number,
): Promise<HTMLCanvasElement[]> {
  // Include atlas rev so HMR never reuses stale normalized frames.
  const key = `r${EMERALD_WYVERN_ATLAS_REV}:${pose}:${facing}`;
  const cached = animCache.get(key);
  if (cached) return cached;

  const raw = (
    await Promise.all(Array.from({ length: count }, (_, i) => loadPng(frameUrl(pose, facing, i))))
  ).filter((f): f is HTMLCanvasElement => f !== null);

  if (!raw.length) return [];
  const frames = normalizeSequence(raw, facing);
  animCache.set(key, frames);
  return frames;
}

export async function loadWyvernFrames(
  pose: WyvernPose,
  facing: WyvernFacing,
): Promise<HTMLCanvasElement[]> {
  if (pose === 'idle') {
    // Idle_Long north reads stretched — use a held walk frame instead.
    if (facing !== 'north') {
      const anim = await loadFrameSequence('idle', facing, IDLE_FRAME_COUNT);
      if (anim.length) return anim;
    }
    const walk = await loadFrameSequence('walk', facing, WALK_FRAME_COUNT);
    return walk.length ? [walk[0]!] : [];
  }
  return loadFrameSequence('walk', facing, WALK_FRAME_COUNT);
}

export async function preloadEmeraldWyvern(): Promise<Map<string, HTMLCanvasElement[]>> {
  const map = new Map<string, HTMLCanvasElement[]>();
  await Promise.all(
    WYVERN_FACINGS.map(async (facing) => {
      const walk = await loadWyvernFrames('walk', facing);
      if (walk.length) map.set(`walk:${facing}`, walk);
      const idle = await loadWyvernFrames('idle', facing);
      if (idle.length) map.set(`idle:${facing}`, idle);
    }),
  );
  return map;
}
