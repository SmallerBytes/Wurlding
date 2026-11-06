/**
 * Fae Princess companion — PNG frame-sequence atlas.
 * Frames live in /public/critters/fae-princess/{launch|fly|kiss|aura}/…
 *
 * Move: launch (on a new travel heading) → fly loop.
 * While flying south: blow a kiss, then back to fly.
 * While perched: flutter idle, then the glowing aura cycle.
 */

import { facingFromDelta, type BearFacing } from './alligatorBear';

export type FaeFacing = BearFacing;
export type FaePose = 'idle' | 'walk' | 'launch' | 'kiss' | 'aura';

export const FAE_FACINGS: FaeFacing[] = [
  'south',
  'south-east',
  'east',
  'north-east',
  'north',
  'north-west',
  'west',
  'south-west',
];

/** Aura pack only ships these four headings. */
export const FAE_AURA_FACINGS: FaeFacing[] = ['south', 'south-east', 'south-west', 'north'];

export { facingFromDelta };

export const FAE_PRINCESS_SIZE = 68;
export const FAE_PRINCESS_SCALE = 2;
export const FAE_PRINCESS_FRAME_TIME = 0.08;
export const FAE_PRINCESS_ATLAS_REV = 4;
/** How long she must fly south before a kiss. */
export const FAE_SOUTH_KISS_AFTER = 4.5;
/** Minimum gap between launches so orbit/heading flicker doesn't teleport her. */
export const FAE_LAUNCH_COOLDOWN = 1.15;
/** Flutter on a perch before the aura cycle. */
export const FAE_AURA_AFTER = 1.4;

const LAUNCH_FRAME_COUNT = 9;
const FLY_FRAME_COUNT = 17;
const KISS_FRAME_COUNT = 9;
const AURA_FRAME_COUNT = 41;

export function launchFacing(facing: FaeFacing): FaeFacing {
  return facing;
}

/** Map any facing onto the aura pack. */
export function auraFacing(facing: FaeFacing): FaeFacing {
  switch (facing) {
    case 'east':
    case 'south-east':
      return 'south-east';
    case 'west':
    case 'south-west':
      return 'south-west';
    case 'north':
    case 'north-east':
    case 'north-west':
      return 'north';
    default:
      return 'south';
  }
}

function frameUrl(
  pose: 'launch' | 'fly' | 'kiss' | 'aura',
  facing: FaeFacing,
  index: number,
): string {
  const base = import.meta.env.BASE_URL || '/';
  const n = String(index).padStart(3, '0');
  return `${base}critters/fae-princess/${pose}/${facing}/frame_${n}.png`;
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
  canvas.width = img.naturalWidth || FAE_PRINCESS_SIZE;
  canvas.height = img.naturalHeight || FAE_PRINCESS_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);
  return canvas;
}

async function loadFrameSequence(
  pose: 'launch' | 'fly' | 'kiss' | 'aura',
  facing: FaeFacing,
  count: number,
): Promise<HTMLCanvasElement[]> {
  const key = `r${FAE_PRINCESS_ATLAS_REV}:${pose}:${facing}`;
  const cached = animCache.get(key);
  if (cached) return cached;

  const frames = (
    await Promise.all(Array.from({ length: count }, (_, i) => loadPng(frameUrl(pose, facing, i))))
  ).filter((f): f is HTMLCanvasElement => f !== null);

  if (frames.length) animCache.set(key, frames);
  return frames;
}

export async function loadFaeFrames(pose: FaePose, facing: FaeFacing): Promise<HTMLCanvasElement[]> {
  if (pose === 'launch') {
    return loadFrameSequence('launch', launchFacing(facing), LAUNCH_FRAME_COUNT);
  }
  if (pose === 'kiss') {
    return loadFrameSequence('kiss', 'south', KISS_FRAME_COUNT);
  }
  if (pose === 'aura') {
    return loadFrameSequence('aura', auraFacing(facing), AURA_FRAME_COUNT);
  }
  // idle + walk both use the flutter / fly loop
  return loadFrameSequence('fly', facing, FLY_FRAME_COUNT);
}

export async function preloadFaePrincess(): Promise<Map<string, HTMLCanvasElement[]>> {
  const map = new Map<string, HTMLCanvasElement[]>();
  await Promise.all(
    FAE_FACINGS.map(async (facing) => {
      const fly = await loadFaeFrames('walk', facing);
      if (fly.length) {
        map.set(`walk:${facing}`, fly);
        map.set(`idle:${facing}`, fly);
        map.set(`fly:${facing}`, fly);
      }
      const launch = await loadFaeFrames('launch', facing);
      if (launch.length) map.set(`launch:${facing}`, launch);
    }),
  );
  const kiss = await loadFaeFrames('kiss', 'south');
  if (kiss.length) {
    map.set('kiss:south', kiss);
    for (const facing of FAE_FACINGS) {
      map.set(`kiss:${facing}`, kiss);
    }
  }
  await Promise.all(
    FAE_AURA_FACINGS.map(async (packFacing) => {
      const aura = await loadFaeFrames('aura', packFacing);
      if (!aura.length) return;
      for (const facing of FAE_FACINGS) {
        if (auraFacing(facing) === packFacing) map.set(`aura:${facing}`, aura);
      }
    }),
  );
  return map;
}
