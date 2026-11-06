/**
 * Goblin Warrior Priest — PNG frame-sequence atlas.
 * Frames live in /public/critters/goblin-priest/{walk|fight-idle|kick|mask|jump}/…
 *
 * Pause loop: fight-idle → (kick → fight-idle) OR (mask → walk).
 */

import { facingFromDelta, type BearFacing } from './alligatorBear';

export type GoblinFacing = BearFacing;
export type GoblinPose = 'idle' | 'walk' | 'kick' | 'mask' | 'jump';

export const GOBLIN_FACINGS: GoblinFacing[] = [
  'south',
  'south-east',
  'east',
  'north-east',
  'north',
  'north-west',
  'west',
  'south-west',
];

/** Fight-stance idle only exists for south + south-west. */
export const GOBLIN_FIGHT_IDLE_FACINGS: GoblinFacing[] = ['south', 'south-west'];

export { facingFromDelta };

export const GOBLIN_PRIEST_SIZE = 64;
export const GOBLIN_PRIEST_SCALE = 2;
export const GOBLIN_PRIEST_FRAME_TIME = 0.12;
export const GOBLIN_PRIEST_ATLAS_REV = 1;
export const GOBLIN_MASK_FRAME_TIME = 0.1;

const WALK_FRAME_COUNT = 8;
const FIGHT_IDLE_FRAME_COUNT = 8;
const KICK_FRAME_COUNT = 7;
const MASK_FRAME_COUNT = 41;
const JUMP_FRAME_COUNT = 9;

export function fightIdleFacing(facing: GoblinFacing): GoblinFacing {
  if (GOBLIN_FIGHT_IDLE_FACINGS.includes(facing)) return facing;
  // Bias westward views to SW; everything else to south.
  if (facing === 'west' || facing === 'north-west') return 'south-west';
  return 'south';
}

function frameUrl(
  pose: 'walk' | 'fight-idle' | 'kick' | 'mask' | 'jump',
  facing: GoblinFacing,
  index: number,
): string {
  const base = import.meta.env.BASE_URL || '/';
  const n = String(index).padStart(3, '0');
  return `${base}critters/goblin-priest/${pose}/${facing}/frame_${n}.png`;
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
  canvas.width = img.naturalWidth || GOBLIN_PRIEST_SIZE;
  canvas.height = img.naturalHeight || GOBLIN_PRIEST_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);
  return canvas;
}

async function loadFrameSequence(
  pose: 'walk' | 'fight-idle' | 'kick' | 'mask' | 'jump',
  facing: GoblinFacing,
  count: number,
): Promise<HTMLCanvasElement[]> {
  const key = `r${GOBLIN_PRIEST_ATLAS_REV}:${pose}:${facing}`;
  const cached = animCache.get(key);
  if (cached) return cached;

  const frames = (
    await Promise.all(Array.from({ length: count }, (_, i) => loadPng(frameUrl(pose, facing, i))))
  ).filter((f): f is HTMLCanvasElement => f !== null);

  if (frames.length) animCache.set(key, frames);
  return frames;
}

export async function loadGoblinFrames(
  pose: GoblinPose,
  facing: GoblinFacing,
): Promise<HTMLCanvasElement[]> {
  if (pose === 'idle') {
    const f = fightIdleFacing(facing);
    const idle = await loadFrameSequence('fight-idle', f, FIGHT_IDLE_FRAME_COUNT);
    if (idle.length) return idle;
    const walk = await loadFrameSequence('walk', facing, WALK_FRAME_COUNT);
    return walk.length ? [walk[0]!] : [];
  }
  if (pose === 'kick') {
    return loadFrameSequence('kick', facing, KICK_FRAME_COUNT);
  }
  if (pose === 'mask') {
    return loadFrameSequence('mask', 'south', MASK_FRAME_COUNT);
  }
  if (pose === 'jump') {
    return loadFrameSequence('jump', facing, JUMP_FRAME_COUNT);
  }
  return loadFrameSequence('walk', facing, WALK_FRAME_COUNT);
}

export async function preloadGoblinPriest(): Promise<Map<string, HTMLCanvasElement[]>> {
  const map = new Map<string, HTMLCanvasElement[]>();
  await Promise.all(
    GOBLIN_FACINGS.map(async (facing) => {
      const walk = await loadGoblinFrames('walk', facing);
      if (walk.length) map.set(`walk:${facing}`, walk);
      const jump = await loadGoblinFrames('jump', facing);
      if (jump.length) map.set(`jump:${facing}`, jump);
      const kick = await loadGoblinFrames('kick', facing);
      if (kick.length) {
        map.set(`kick:${facing}`, kick);
        map.set(`roar:${facing}`, kick);
      }
    }),
  );
  for (const facing of GOBLIN_FIGHT_IDLE_FACINGS) {
    const idle = await loadGoblinFrames('idle', facing);
    if (idle.length) {
      map.set(`idle:${facing}`, idle);
      map.set(`fight-idle:${facing}`, idle);
    }
  }
  // Alias other facings to nearest fight-idle.
  for (const facing of GOBLIN_FACINGS) {
    if (map.has(`idle:${facing}`)) continue;
    const snap = fightIdleFacing(facing);
    const idle = map.get(`idle:${snap}`);
    if (idle) map.set(`idle:${facing}`, idle);
  }
  const mask = await loadGoblinFrames('mask', 'south');
  if (mask.length) {
    map.set('mask:south', mask);
    for (const facing of GOBLIN_FACINGS) {
      map.set(`mask:${facing}`, mask);
      map.set(`wake:${facing}`, mask);
    }
  }
  return map;
}
