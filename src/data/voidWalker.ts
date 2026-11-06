/**
 * The Void Walker companion — PNG walk/idle + GIF sword-unsheath flourish.
 * Frames live in /public/critters/void-walker/{walk|idle}/… and attack/south.gif
 */

import { parseGIF, decompressFrames } from 'gifuct-js';
import { facingFromDelta, type BearFacing } from './alligatorBear';

export type VoidFacing = BearFacing;
export type VoidPose = 'idle' | 'walk' | 'attack';

export const VOID_FACINGS: VoidFacing[] = [
  'south',
  'south-east',
  'east',
  'north-east',
  'north',
  'north-west',
  'west',
  'south-west',
];

/** Sword-draw attack currently only exists for south. */
export const VOID_ATTACK_FACINGS: VoidFacing[] = ['south'];

export { facingFromDelta };

export const VOID_WALKER_SIZE = 68;
export const VOID_WALKER_SCALE = 2;
export const VOID_WALKER_FRAME_TIME = 0.12;
/** Sword-unsheath GIF frame delay (200ms). */
export const VOID_ATTACK_FRAME_TIME = 0.2;
/** Draw the sword-unsheath flourish larger than the walk box. */
export const VOID_ATTACK_DRAW_SCALE = 1.28;
export const VOID_WALKER_ATLAS_REV = 10;

const WALK_FRAME_COUNT = 8;
const IDLE_FRAME_COUNT = 8;

export function attackFacing(facing: VoidFacing): VoidFacing {
  return VOID_ATTACK_FACINGS.includes(facing) ? facing : 'south';
}

function frameUrl(pose: 'walk' | 'idle', facing: VoidFacing, index: number): string {
  const base = import.meta.env.BASE_URL || '/';
  const n = String(index).padStart(3, '0');
  return `${base}critters/void-walker/${pose}/${facing}/frame_${n}.png`;
}

function attackGifUrl(facing: VoidFacing): string {
  const base = import.meta.env.BASE_URL || '/';
  return `${base}critters/void-walker/attack/${attackFacing(facing)}.gif`;
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
  canvas.width = img.naturalWidth || VOID_WALKER_SIZE;
  canvas.height = img.naturalHeight || VOID_WALKER_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);
  return canvas;
}

async function loadFrameSequence(
  pose: 'walk' | 'idle',
  facing: VoidFacing,
  count: number,
): Promise<HTMLCanvasElement[]> {
  const key = `r${VOID_WALKER_ATLAS_REV}:${pose}:${facing}`;
  const cached = animCache.get(key);
  if (cached) return cached;

  const frames = (
    await Promise.all(Array.from({ length: count }, (_, i) => loadPng(frameUrl(pose, facing, i))))
  ).filter((f): f is HTMLCanvasElement => f !== null);

  if (frames.length) animCache.set(key, frames);
  return frames;
}

async function loadAttackGif(facing: VoidFacing): Promise<HTMLCanvasElement[]> {
  const f = attackFacing(facing);
  const key = `r${VOID_WALKER_ATLAS_REV}:attack:${f}`;
  const cached = animCache.get(key);
  if (cached) return cached;
  if (typeof document === 'undefined') return [];

  let buffer: ArrayBuffer;
  try {
    const res = await fetch(attackGifUrl(f));
    if (!res.ok) return [];
    buffer = await res.arrayBuffer();
  } catch {
    return [];
  }

  try {
    const gif = parseGIF(buffer);
    const frames = decompressFrames(gif, true);
    if (!frames.length) return [];

    const width = gif.lsd?.width || frames[0]!.dims.width;
    const height = gif.lsd?.height || frames[0]!.dims.height;
    const out: HTMLCanvasElement[] = [];

    const stage = document.createElement('canvas');
    stage.width = width;
    stage.height = height;
    const stageCtx = stage.getContext('2d');
    if (!stageCtx) return [];
    stageCtx.imageSmoothingEnabled = false;

    for (const frame of frames) {
      const { left, top, width: fw, height: fh } = frame.dims;
      const disposal = frame.disposalType;
      const patch = new ImageData(new Uint8ClampedArray(frame.patch), fw, fh);
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
      out.push(canvas);

      if (disposal === 2) {
        stageCtx.clearRect(left, top, fw, fh);
      }
    }

    if (out.length) animCache.set(key, out);
    return out;
  } catch {
    return [];
  }
}

export async function loadVoidFrames(pose: VoidPose, facing: VoidFacing): Promise<HTMLCanvasElement[]> {
  if (pose === 'idle') {
    const idle = await loadFrameSequence('idle', facing, IDLE_FRAME_COUNT);
    if (idle.length) return idle;
    const walk = await loadFrameSequence('walk', facing, WALK_FRAME_COUNT);
    return walk.length ? [walk[0]!] : [];
  }

  if (pose === 'attack') {
    return loadAttackGif(facing);
  }

  return loadFrameSequence('walk', facing, WALK_FRAME_COUNT);
}

export async function preloadVoidWalker(): Promise<Map<string, HTMLCanvasElement[]>> {
  const map = new Map<string, HTMLCanvasElement[]>();
  await Promise.all(
    VOID_FACINGS.map(async (facing) => {
      const walk = await loadVoidFrames('walk', facing);
      if (walk.length) map.set(`walk:${facing}`, walk);
      const idle = await loadVoidFrames('idle', facing);
      if (idle.length) map.set(`idle:${facing}`, idle);
    }),
  );
  const attack = await loadVoidFrames('attack', 'south');
  if (attack.length) {
    map.set('attack:south', attack);
    for (const facing of VOID_FACINGS) {
      map.set(`attack:${facing}`, attack);
      map.set(`roar:${facing}`, attack);
    }
  }
  return map;
}
