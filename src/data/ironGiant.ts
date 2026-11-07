/**
 * The Iron Giant — PNG frame-sequence atlas.
 * Frames live in /public/critters/iron-giant/{walk|idle|flash}/…
 *
 * Walk / idle loops in 8 directions; pause flashes his eyes yellow→red.
 */

import { facingFromDelta, type BearFacing } from './alligatorBear';

export type IronGiantFacing = BearFacing;
export type IronGiantPose = 'idle' | 'walk' | 'roar';

export const IRON_GIANT_FACINGS: IronGiantFacing[] = [
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

export const IRON_GIANT_SIZE = 96;
export const IRON_GIANT_SCALE = 2;
export const IRON_GIANT_FRAME_TIME = 0.12;
/** Eye-flash flourish frame delay. */
export const IRON_GIANT_FLASH_FRAME_TIME = 0.09;
export const IRON_GIANT_ATLAS_REV = 2;

const WALK_FRAME_COUNT = 9;
const IDLE_FRAME_COUNT = 8;
const FLASH_FRAME_COUNT = 41;

function frameUrl(
  pose: 'walk' | 'idle' | 'flash',
  facing: IronGiantFacing,
  index: number,
): string {
  const base = import.meta.env.BASE_URL || '/';
  const n = String(index).padStart(3, '0');
  return `${base}critters/iron-giant/${pose}/${facing}/frame_${n}.png`;
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
  canvas.width = img.naturalWidth || IRON_GIANT_SIZE;
  canvas.height = img.naturalHeight || IRON_GIANT_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);
  return canvas;
}

async function loadFrameSequence(
  pose: 'walk' | 'idle' | 'flash',
  facing: IronGiantFacing,
  count: number,
): Promise<HTMLCanvasElement[]> {
  const key = `ig${IRON_GIANT_ATLAS_REV}:${pose}:${facing}`;
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

export async function loadIronGiantFrames(
  pose: IronGiantPose,
  facing: IronGiantFacing,
): Promise<HTMLCanvasElement[]> {
  if (pose === 'roar') {
    return loadFrameSequence('flash', 'south', FLASH_FRAME_COUNT);
  }
  if (pose === 'idle') {
    return loadFrameSequence('idle', facing, IDLE_FRAME_COUNT);
  }
  return loadFrameSequence('walk', facing, WALK_FRAME_COUNT);
}

export async function preloadIronGiant(): Promise<Map<string, HTMLCanvasElement[]>> {
  const map = new Map<string, HTMLCanvasElement[]>();
  await Promise.all(
    IRON_GIANT_FACINGS.map(async (facing) => {
      const walk = await loadIronGiantFrames('walk', facing);
      if (walk.length) map.set(`walk:${facing}`, walk);
      const idle = await loadIronGiantFrames('idle', facing);
      if (idle.length) map.set(`idle:${facing}`, idle);
    }),
  );
  const flash = await loadIronGiantFrames('roar', 'south');
  if (flash.length) map.set('roar:south', flash);
  return map;
}
