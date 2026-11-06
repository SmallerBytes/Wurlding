/**
 * Emerald Wyvern companion — PNG frame-sequence atlas.
 * Frames live in /public/critters/emerald-wyvern/{walk|idle|fire}/…
 */

import { facingFromDelta, type BearFacing } from './alligatorBear';

export type WyvernFacing = BearFacing;
export type WyvernPose = 'idle' | 'walk' | 'fire';

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

/** Fire-breath currently only exists for south. */
export const WYVERN_FIRE_FACINGS: WyvernFacing[] = ['south'];

export { facingFromDelta };

export const EMERALD_WYVERN_SIZE = 48;
export const EMERALD_WYVERN_SCALE = 2;
export const EMERALD_WYVERN_FRAME_TIME = 0.12;
export const EMERALD_WYVERN_ATLAS_REV = 4;

const WALK_FRAME_COUNT = 8;
const IDLE_FRAME_COUNT = 15;
const FIRE_FRAME_COUNT = 15;

export function fireFacing(facing: WyvernFacing): WyvernFacing {
  return WYVERN_FIRE_FACINGS.includes(facing) ? facing : 'south';
}

function frameUrl(pose: 'walk' | 'idle' | 'fire', facing: WyvernFacing, index: number): string {
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
  pose: 'walk' | 'idle' | 'fire',
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
  if (pose === 'fire') {
    return loadFrameSequence('fire', fireFacing(facing), FIRE_FRAME_COUNT);
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
  const fire = await loadWyvernFrames('fire', 'south');
  if (fire.length) {
    map.set('fire:south', fire);
    // Alias as roar so the idle flourish timer can play fire-breath.
    for (const facing of WYVERN_FACINGS) {
      map.set(`fire:${facing}`, fire);
      map.set(`roar:${facing}`, fire);
    }
  }
  return map;
}
