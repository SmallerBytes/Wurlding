/**
 * The Golem — PNG frame-sequence atlas.
 * Frames live in /public/critters/golem/{walk|idle|channel|lift}/…
 *
 * Walk / idle loops in 8 directions; pause channels earth-green energy or
 * startles a bird off his shoulder.
 */

import { facingFromDelta, type BearFacing } from './alligatorBear';

export type GolemFacing = BearFacing;
export type GolemPose = 'idle' | 'walk' | 'roar' | 'aura';

export const GOLEM_FACINGS: GolemFacing[] = [
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

export const GOLEM_SIZE = 56;
export const GOLEM_SCALE = 2;
export const GOLEM_FRAME_TIME = 0.14;
/** Channel earth-energy flourish. */
export const GOLEM_CHANNEL_FRAME_TIME = 0.09;
/** Shoulder bird lift-off flourish. */
export const GOLEM_LIFT_FRAME_TIME = 0.09;
/** Idle reads a touch small in the box — draw slightly larger, feet pinned. */
export const GOLEM_IDLE_DRAW_SCALE = 1.08;
/** Walk cycle — draw slightly larger, feet pinned. */
export const GOLEM_WALK_DRAW_SCALE = 1.08;
/** Channel-energy flourish — draw slightly larger, feet pinned. */
export const GOLEM_CHANNEL_DRAW_SCALE = 1.08;
/** Lift-off frames are wider than the walk box — draw a bit larger, feet pinned. */
export const GOLEM_LIFT_DRAW_SCALE = 1.1;
export const GOLEM_ATLAS_REV = 2;

const WALK_FRAME_COUNT = 8;
const IDLE_FRAME_COUNT = 8;
const CHANNEL_FRAME_COUNT = 41;
const LIFT_FRAME_COUNT = 41;

function frameUrl(
  pose: 'walk' | 'idle' | 'channel' | 'lift',
  facing: GolemFacing,
  index: number,
): string {
  const base = import.meta.env.BASE_URL || '/';
  const n = String(index).padStart(3, '0');
  return `${base}critters/golem/${pose}/${facing}/frame_${n}.png`;
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
  canvas.width = img.naturalWidth || GOLEM_SIZE;
  canvas.height = img.naturalHeight || GOLEM_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);
  return canvas;
}

async function loadFrameSequence(
  pose: 'walk' | 'idle' | 'channel' | 'lift',
  facing: GolemFacing,
  count: number,
): Promise<HTMLCanvasElement[]> {
  const key = `g${GOLEM_ATLAS_REV}:${pose}:${facing}`;
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

export async function loadGolemFrames(
  pose: GolemPose,
  facing: GolemFacing,
): Promise<HTMLCanvasElement[]> {
  if (pose === 'roar') {
    return loadFrameSequence('channel', 'south', CHANNEL_FRAME_COUNT);
  }
  if (pose === 'aura') {
    return loadFrameSequence('lift', 'south', LIFT_FRAME_COUNT);
  }
  if (pose === 'idle') {
    return loadFrameSequence('idle', facing, IDLE_FRAME_COUNT);
  }
  return loadFrameSequence('walk', facing, WALK_FRAME_COUNT);
}

export async function preloadGolem(): Promise<Map<string, HTMLCanvasElement[]>> {
  const map = new Map<string, HTMLCanvasElement[]>();
  await Promise.all(
    GOLEM_FACINGS.map(async (facing) => {
      const walk = await loadGolemFrames('walk', facing);
      if (walk.length) map.set(`walk:${facing}`, walk);
      const idle = await loadGolemFrames('idle', facing);
      if (idle.length) map.set(`idle:${facing}`, idle);
    }),
  );
  const channel = await loadGolemFrames('roar', 'south');
  if (channel.length) map.set('roar:south', channel);
  const lift = await loadGolemFrames('aura', 'south');
  if (lift.length) map.set('aura:south', lift);
  return map;
}
