/**
 * Necromage — PNG frame-sequence atlas.
 * Frames live in /public/critters/necromage/{walk|idle|flame|shadow}/…
 *
 * Walk / idle loops in 8 directions; pause conjures green staff-flame or a shadow.
 */

import { facingFromDelta, type BearFacing } from './alligatorBear';

export type NecromageFacing = BearFacing;
export type NecromagePose = 'idle' | 'walk' | 'roar' | 'aura';

export const NECROMAGE_FACINGS: NecromageFacing[] = [
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

export const NECROMAGE_SIZE = 64;
export const NECROMAGE_SCALE = 2;
export const NECROMAGE_FRAME_TIME = 0.12;
/** Staff-flame conjure flourish. */
export const NECROMAGE_FLAME_FRAME_TIME = 0.09;
/** Shadow flourish. */
export const NECROMAGE_SHADOW_FRAME_TIME = 0.09;
export const NECROMAGE_ATLAS_REV = 1;

const WALK_FRAME_COUNT = 8;
const IDLE_FRAME_COUNT = 8;
const FLAME_FRAME_COUNT = 41;
const SHADOW_FRAME_COUNT = 29;

function frameUrl(
  pose: 'walk' | 'idle' | 'flame' | 'shadow',
  facing: NecromageFacing,
  index: number,
): string {
  const base = import.meta.env.BASE_URL || '/';
  const n = String(index).padStart(3, '0');
  return `${base}critters/necromage/${pose}/${facing}/frame_${n}.png`;
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
  canvas.width = img.naturalWidth || NECROMAGE_SIZE;
  canvas.height = img.naturalHeight || NECROMAGE_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);
  return canvas;
}

async function loadFrameSequence(
  pose: 'walk' | 'idle' | 'flame' | 'shadow',
  facing: NecromageFacing,
  count: number,
): Promise<HTMLCanvasElement[]> {
  const key = `n${NECROMAGE_ATLAS_REV}:${pose}:${facing}`;
  const cached = animCache.get(key);
  if (cached) return cached;

  const loaded = await Promise.all(
    Array.from({ length: count }, async (_, i) => {
      const url = frameUrl(pose, facing, i);
      let canvas = await loadPng(url);
      if (!canvas) canvas = await loadPng(url);
      return canvas;
    }),
  );
  let fallback: HTMLCanvasElement | null = null;
  for (const canvas of loaded) {
    if (canvas) {
      fallback = canvas;
      break;
    }
  }
  if (!fallback) return [];

  const frames: HTMLCanvasElement[] = new Array(count);
  for (let i = 0; i < count; i++) {
    const canvas = loaded[i] ?? (i > 0 ? frames[i - 1] : null) ?? fallback;
    frames[i] = canvas!;
  }

  animCache.set(key, frames);
  return frames;
}

export async function loadNecromageFrames(
  pose: NecromagePose,
  facing: NecromageFacing,
): Promise<HTMLCanvasElement[]> {
  if (pose === 'roar') {
    return loadFrameSequence('flame', 'south', FLAME_FRAME_COUNT);
  }
  if (pose === 'aura') {
    return loadFrameSequence('shadow', 'south', SHADOW_FRAME_COUNT);
  }
  if (pose === 'idle') {
    return loadFrameSequence('idle', facing, IDLE_FRAME_COUNT);
  }
  return loadFrameSequence('walk', facing, WALK_FRAME_COUNT);
}

export async function preloadNecromage(): Promise<Map<string, HTMLCanvasElement[]>> {
  const map = new Map<string, HTMLCanvasElement[]>();
  await Promise.all(
    NECROMAGE_FACINGS.map(async (facing) => {
      const walk = await loadNecromageFrames('walk', facing);
      if (walk.length) map.set(`walk:${facing}`, walk);
      const idle = await loadNecromageFrames('idle', facing);
      if (idle.length) map.set(`idle:${facing}`, idle);
    }),
  );
  const flame = await loadNecromageFrames('roar', 'south');
  if (flame.length) map.set('roar:south', flame);
  const shadow = await loadNecromageFrames('aura', 'south');
  if (shadow.length) map.set('aura:south', shadow);
  return map;
}
