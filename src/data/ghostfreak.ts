/**
 * Ghostfreak — PNG frame-sequence atlas.
 * Frames live in /public/critters/ghostfreak/{walk|idle|void|sink}/…
 *
 * Drift loops in 8 directions; pause opens a stomach-void or sinks beneath the floor.
 */

import { facingFromDelta, type BearFacing } from './alligatorBear';

export type GhostfreakFacing = BearFacing;
export type GhostfreakPose = 'idle' | 'walk' | 'roar' | 'aura';

export const GHOSTFREAK_FACINGS: GhostfreakFacing[] = [
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

export const GHOSTFREAK_SIZE = 64;
export const GHOSTFREAK_SCALE = 2;
export const GHOSTFREAK_FRAME_TIME = 0.1;
/** Stomach-void flourish. */
export const GHOSTFREAK_VOID_FRAME_TIME = 0.09;
/** Sink-beneath-floor flourish. */
export const GHOSTFREAK_SINK_FRAME_TIME = 0.09;
export const GHOSTFREAK_ATLAS_REV = 1;

const MOVE_FRAME_COUNT = 9;
const VOID_FRAME_COUNT = 41;
const SINK_FRAME_COUNT = 41;

function frameUrl(
  pose: 'walk' | 'idle' | 'void' | 'sink',
  facing: GhostfreakFacing,
  index: number,
): string {
  const base = import.meta.env.BASE_URL || '/';
  const n = String(index).padStart(3, '0');
  return `${base}critters/ghostfreak/${pose}/${facing}/frame_${n}.png`;
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
  canvas.width = img.naturalWidth || GHOSTFREAK_SIZE;
  canvas.height = img.naturalHeight || GHOSTFREAK_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);
  return canvas;
}

async function loadFrameSequence(
  pose: 'walk' | 'idle' | 'void' | 'sink',
  facing: GhostfreakFacing,
  count: number,
): Promise<HTMLCanvasElement[]> {
  const key = `gf${GHOSTFREAK_ATLAS_REV}:${pose}:${facing}`;
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

export async function loadGhostfreakFrames(
  pose: GhostfreakPose,
  facing: GhostfreakFacing,
): Promise<HTMLCanvasElement[]> {
  if (pose === 'roar') {
    return loadFrameSequence('void', 'south', VOID_FRAME_COUNT);
  }
  if (pose === 'aura') {
    return loadFrameSequence('sink', 'south', SINK_FRAME_COUNT);
  }
  if (pose === 'idle') {
    return loadFrameSequence('idle', facing, MOVE_FRAME_COUNT);
  }
  return loadFrameSequence('walk', facing, MOVE_FRAME_COUNT);
}

export async function preloadGhostfreak(): Promise<Map<string, HTMLCanvasElement[]>> {
  const map = new Map<string, HTMLCanvasElement[]>();
  await Promise.all(
    GHOSTFREAK_FACINGS.map(async (facing) => {
      const walk = await loadGhostfreakFrames('walk', facing);
      if (walk.length) map.set(`walk:${facing}`, walk);
      const idle = await loadGhostfreakFrames('idle', facing);
      if (idle.length) map.set(`idle:${facing}`, idle);
    }),
  );
  const voidFrames = await loadGhostfreakFrames('roar', 'south');
  if (voidFrames.length) map.set('roar:south', voidFrames);
  const sink = await loadGhostfreakFrames('aura', 'south');
  if (sink.length) map.set('aura:south', sink);
  return map;
}
