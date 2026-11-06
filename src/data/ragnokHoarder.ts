/**
 * Ragnok the Hoarder — PNG frame-sequence atlas.
 * Frames live in /public/critters/ragnok/{walk|idle|flame}/…
 *
 * Walk / idle loops in 8 directions; pause occasionally ignites a flame burst.
 */

import { facingFromDelta, type BearFacing } from './alligatorBear';

export type RagnokFacing = BearFacing;
export type RagnokPose = 'idle' | 'walk' | 'roar';

export const RAGNOK_FACINGS: RagnokFacing[] = [
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

export const RAGNOK_SIZE = 68;
export const RAGNOK_SCALE = 2;
export const RAGNOK_FRAME_TIME = 0.12;
/** Flame-burst flourish frame delay. */
export const RAGNOK_FLAME_FRAME_TIME = 0.09;
export const RAGNOK_ATLAS_REV = 1;

const WALK_FRAME_COUNT = 8;
const IDLE_FRAME_COUNT = 8;
const FLAME_FRAME_COUNT = 41;

function frameUrl(pose: 'walk' | 'idle' | 'flame', facing: RagnokFacing, index: number): string {
  const base = import.meta.env.BASE_URL || '/';
  const n = String(index).padStart(3, '0');
  return `${base}critters/ragnok/${pose}/${facing}/frame_${n}.png`;
}

const animCache = new Map<string, HTMLCanvasElement[]>();

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
  canvas.width = img.naturalWidth || RAGNOK_SIZE;
  canvas.height = img.naturalHeight || RAGNOK_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);
  return canvas;
}

async function loadFrameSequence(
  pose: 'walk' | 'idle' | 'flame',
  facing: RagnokFacing,
  count: number,
): Promise<HTMLCanvasElement[]> {
  const key = `r${RAGNOK_ATLAS_REV}:${pose}:${facing}`;
  const cached = animCache.get(key);
  if (cached) return cached;

  const frames = (
    await Promise.all(Array.from({ length: count }, (_, i) => loadPng(frameUrl(pose, facing, i))))
  ).filter((f): f is HTMLCanvasElement => f !== null);

  if (frames.length) animCache.set(key, frames);
  return frames;
}

export async function loadRagnokFrames(
  pose: RagnokPose,
  facing: RagnokFacing,
): Promise<HTMLCanvasElement[]> {
  if (pose === 'roar') {
    return loadFrameSequence('flame', facing, FLAME_FRAME_COUNT);
  }
  if (pose === 'idle') {
    return loadFrameSequence('idle', facing, IDLE_FRAME_COUNT);
  }
  return loadFrameSequence('walk', facing, WALK_FRAME_COUNT);
}

export async function preloadRagnok(): Promise<Map<string, HTMLCanvasElement[]>> {
  const map = new Map<string, HTMLCanvasElement[]>();
  await Promise.all(
    RAGNOK_FACINGS.map(async (facing) => {
      const walk = await loadRagnokFrames('walk', facing);
      if (walk.length) map.set(`walk:${facing}`, walk);
      const idle = await loadRagnokFrames('idle', facing);
      if (idle.length) map.set(`idle:${facing}`, idle);
      const flame = await loadRagnokFrames('roar', facing);
      if (flame.length) map.set(`roar:${facing}`, flame);
    }),
  );
  return map;
}
