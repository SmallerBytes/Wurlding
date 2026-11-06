/**
 * The Void Walker companion — PNG frame-sequence atlas.
 * Frames live in /public/critters/void-walker/{walk|attack}/…
 */

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

export const VOID_WALKER_SIZE = 48;
export const VOID_WALKER_SCALE = 2;
export const VOID_WALKER_FRAME_TIME = 0.12;
export const VOID_WALKER_ATLAS_REV = 2;

const WALK_FRAME_COUNT = 8;
const ATTACK_FRAME_COUNT = 15;

export function attackFacing(facing: VoidFacing): VoidFacing {
  return VOID_ATTACK_FACINGS.includes(facing) ? facing : 'south';
}

function walkFrameUrl(facing: VoidFacing, index: number): string {
  const base = import.meta.env.BASE_URL || '/';
  const n = String(index).padStart(3, '0');
  return `${base}critters/void-walker/walk/${facing}/frame_${n}.png`;
}

function attackFrameUrl(facing: VoidFacing, index: number): string {
  const base = import.meta.env.BASE_URL || '/';
  const n = String(index).padStart(3, '0');
  return `${base}critters/void-walker/attack/${facing}/frame_${n}.png`;
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

export async function loadVoidFrames(pose: VoidPose, facing: VoidFacing): Promise<HTMLCanvasElement[]> {
  if (pose === 'idle') {
    const walk = await loadVoidFrames('walk', facing);
    return walk.length ? [walk[0]!] : [];
  }

  if (pose === 'attack') {
    const f = attackFacing(facing);
    const key = `attack:${f}`;
    const cached = animCache.get(key);
    if (cached) return cached;
    const frames = (
      await Promise.all(
        Array.from({ length: ATTACK_FRAME_COUNT }, (_, i) => loadPng(attackFrameUrl(f, i))),
      )
    ).filter((x): x is HTMLCanvasElement => x !== null);
    if (frames.length) animCache.set(key, frames);
    return frames;
  }

  const key = `walk:${facing}`;
  const cached = animCache.get(key);
  if (cached) return cached;
  const frames = (
    await Promise.all(
      Array.from({ length: WALK_FRAME_COUNT }, (_, i) => loadPng(walkFrameUrl(facing, i))),
    )
  ).filter((x): x is HTMLCanvasElement => x !== null);
  if (frames.length) animCache.set(key, frames);
  return frames;
}

export async function preloadVoidWalker(): Promise<Map<string, HTMLCanvasElement[]>> {
  const map = new Map<string, HTMLCanvasElement[]>();
  await Promise.all(
    VOID_FACINGS.map(async (facing) => {
      const walk = await loadVoidFrames('walk', facing);
      if (walk.length) {
        map.set(`walk:${facing}`, walk);
        map.set(`idle:${facing}`, [walk[0]!]);
      }
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
