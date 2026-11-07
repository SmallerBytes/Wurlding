/**
 * Victfur — PNG frame-sequence atlas.
 * Frames live in /public/critters/victfur/{walk|idle|coat|hat}/…
 *
 * Walk / idle loops in 8 directions; pause tips his hat or draws a cigarette case.
 */

import { facingFromDelta, type BearFacing } from './alligatorBear';

export type VictfurFacing = BearFacing;
export type VictfurPose = 'idle' | 'walk' | 'roar' | 'aura';

export const VICTFUR_FACINGS: VictfurFacing[] = [
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

export const VICTFUR_SIZE = 68;
export const VICTFUR_SCALE = 2;
export const VICTFUR_FRAME_TIME = 0.12;
/** Coat cigarette-case flourish. */
export const VICTFUR_COAT_FRAME_TIME = 0.09;
/** Top-hat tip flourish. */
export const VICTFUR_HAT_FRAME_TIME = 0.1;
/** Hat tip frames are wider than the walk box — draw a bit larger, feet pinned. */
export const VICTFUR_HAT_DRAW_SCALE = 1.18;
export const VICTFUR_ATLAS_REV = 1;

const WALK_FRAME_COUNT = 8;
const IDLE_FRAME_COUNT = 8;
const COAT_FRAME_COUNT = 41;
const HAT_FRAME_COUNT = 13;

function frameUrl(
  pose: 'walk' | 'idle' | 'coat' | 'hat',
  facing: VictfurFacing,
  index: number,
): string {
  const base = import.meta.env.BASE_URL || '/';
  const n = String(index).padStart(3, '0');
  return `${base}critters/victfur/${pose}/${facing}/frame_${n}.png`;
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
  canvas.width = img.naturalWidth || VICTFUR_SIZE;
  canvas.height = img.naturalHeight || VICTFUR_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);
  return canvas;
}

async function loadFrameSequence(
  pose: 'walk' | 'idle' | 'coat' | 'hat',
  facing: VictfurFacing,
  count: number,
): Promise<HTMLCanvasElement[]> {
  const key = `v${VICTFUR_ATLAS_REV}:${pose}:${facing}`;
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

export async function loadVictfurFrames(
  pose: VictfurPose,
  facing: VictfurFacing,
): Promise<HTMLCanvasElement[]> {
  if (pose === 'roar') {
    return loadFrameSequence('coat', 'south', COAT_FRAME_COUNT);
  }
  if (pose === 'aura') {
    return loadFrameSequence('hat', 'south', HAT_FRAME_COUNT);
  }
  if (pose === 'idle') {
    return loadFrameSequence('idle', facing, IDLE_FRAME_COUNT);
  }
  return loadFrameSequence('walk', facing, WALK_FRAME_COUNT);
}

export async function preloadVictfur(): Promise<Map<string, HTMLCanvasElement[]>> {
  const map = new Map<string, HTMLCanvasElement[]>();
  await Promise.all(
    VICTFUR_FACINGS.map(async (facing) => {
      const walk = await loadVictfurFrames('walk', facing);
      if (walk.length) map.set(`walk:${facing}`, walk);
      const idle = await loadVictfurFrames('idle', facing);
      if (idle.length) map.set(`idle:${facing}`, idle);
    }),
  );
  const coat = await loadVictfurFrames('roar', 'south');
  if (coat.length) map.set('roar:south', coat);
  const hat = await loadVictfurFrames('aura', 'south');
  if (hat.length) map.set('aura:south', hat);
  return map;
}
