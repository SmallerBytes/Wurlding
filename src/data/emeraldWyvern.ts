/**
 * Emerald Wyvern companion — PNG frame-sequence atlas.
 * Frames live in /public/critters/emerald-wyvern/{walk|idle}/…
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

export const EMERALD_WYVERN_SIZE = 48;
export const EMERALD_WYVERN_SCALE = 2;
export const EMERALD_WYVERN_FRAME_TIME = 0.12;
export const EMERALD_WYVERN_ATLAS_REV = 5;

const WALK_FRAME_COUNT = 8;
const IDLE_FRAME_COUNT = 15;

function frameUrl(pose: 'walk' | 'idle', facing: WyvernFacing, index: number): string {
  const base = import.meta.env.BASE_URL || '/';
  const n = String(index).padStart(3, '0');
  return `${base}critters/emerald-wyvern/${pose}/${facing}/frame_${n}.png`;
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
  const key = `${pose}:${facing}`;
  const cached = animCache.get(key);
  if (cached) return cached;

  const frames = (
    await Promise.all(Array.from({ length: count }, (_, i) => loadPng(frameUrl(pose, facing, i))))
  ).filter((f): f is HTMLCanvasElement => f !== null);

  if (frames.length) animCache.set(key, frames);
  return frames;
}

export async function loadWyvernFrames(
  pose: WyvernPose,
  facing: WyvernFacing,
): Promise<HTMLCanvasElement[]> {
  if (pose === 'idle') {
    const anim = await loadFrameSequence('idle', facing, IDLE_FRAME_COUNT);
    if (anim.length) return anim;
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
