/**
 * Crabacus (Crab King) companion — walk + idle GIF atlas.
 * GIFs live in /public/critters/crabacus/anim/{pose}-{facing}.gif
 */

import { parseGIF, decompressFrames } from 'gifuct-js';
import { facingFromDelta, type BearFacing } from './alligatorBear';

export type CrabFacing = BearFacing;
export type CrabPose = 'idle' | 'walk';

export const CRAB_FACINGS: CrabFacing[] = [
  'south',
  'south-east',
  'east',
  'north-east',
  'north',
  'north-west',
  'west',
  'south-west',
];

/** Idle GIFs currently dropped — missing facings snap via idleGifFacing(). */
export const CRAB_IDLE_GIF_FACINGS: CrabFacing[] = [
  'south',
  'south-east',
  'south-west',
  'north',
];

export { facingFromDelta };

/** Native pixel size of each walk GIF. */
export const CRABACUS_SIZE = 64;
/** On-screen scale (64 × 2 = 128px). */
export const CRABACUS_SCALE = 2;
/** Matches the GIF frame delay (200ms). */
export const CRABACUS_FRAME_TIME = 0.2;
/** Bump when atlas contents change so PixelCritters remounts and re-preloads. */
export const CRABACUS_ATLAS_REV = 8;

export function crabAnimUrl(pose: CrabPose, facing: CrabFacing): string {
  const base = import.meta.env.BASE_URL || '/';
  return `${base}critters/crabacus/anim/${pose}-${facing}.gif`;
}

/** Snap to a facing that has an idle GIF. */
export function idleGifFacing(facing: CrabFacing): CrabFacing {
  if (CRAB_IDLE_GIF_FACINGS.includes(facing)) return facing;
  switch (facing) {
    case 'east':
      return 'south-east';
    case 'west':
      return 'south-west';
    case 'north-east':
    case 'north-west':
      return 'north';
    default:
      return 'south';
  }
}

const animCache = new Map<string, HTMLCanvasElement[]>();

/** Decode an animated GIF into canvases (one per frame). Keeps black ink — GIFs already have alpha. */
export async function loadCrabAnim(pose: CrabPose, facing: CrabFacing): Promise<HTMLCanvasElement[] | null> {
  const key = `${pose}:${facing}`;
  const cached = animCache.get(key);
  if (cached) return cached;
  if (typeof document === 'undefined') return null;

  let buffer: ArrayBuffer;
  try {
    const res = await fetch(crabAnimUrl(pose, facing));
    if (!res.ok) return null;
    buffer = await res.arrayBuffer();
  } catch {
    return null;
  }

  try {
    const gif = parseGIF(buffer);
    const frames = decompressFrames(gif, true);
    if (!frames.length) return null;

    const width = gif.lsd?.width || frames[0]!.dims.width;
    const height = gif.lsd?.height || frames[0]!.dims.height;
    const out: HTMLCanvasElement[] = [];

    const stage = document.createElement('canvas');
    stage.width = width;
    stage.height = height;
    const stageCtx = stage.getContext('2d');
    if (!stageCtx) return null;
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

    if (!out.length) return null;
    animCache.set(key, out);
    return out;
  } catch {
    return null;
  }
}

export async function loadCrabFrames(pose: CrabPose, facing: CrabFacing): Promise<HTMLCanvasElement[]> {
  if (pose === 'idle') {
    const gifFacing = idleGifFacing(facing);
    const anim = await loadCrabAnim('idle', gifFacing);
    if (anim?.length) {
      // Alias under the requested facing so the renderer can look it up directly.
      if (gifFacing !== facing) animCache.set(`idle:${facing}`, anim);
      return anim;
    }
    // Fallback: first walk frame held still.
    const walk = await loadCrabAnim('walk', facing);
    return walk?.length ? [walk[0]!] : [];
  }
  const anim = await loadCrabAnim(pose, facing);
  return anim ?? [];
}

export async function preloadCrabacus(): Promise<Map<string, HTMLCanvasElement[]>> {
  const map = new Map<string, HTMLCanvasElement[]>();
  await Promise.all(
    CRAB_FACINGS.map(async (facing) => {
      const walk = await loadCrabFrames('walk', facing);
      if (walk.length) map.set(`walk:${facing}`, walk);
      const idle = await loadCrabFrames('idle', facing);
      if (idle.length) map.set(`idle:${facing}`, idle);
    }),
  );
  return map;
}
