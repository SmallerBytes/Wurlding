/**
 * Mew — PNG frame-sequence atlas.
 * Frames live in /public/critters/mew/{idle|walk|to-bubble|bubble-walk|pop|sink}/…
 *
 * From south idle, either:
 *   A) mew_to_bubble → moving_bubble → face south → bubble pop → idle
 *   B) Sink_downward_while_pulling_knees_toward_the_chest → idle
 * mew_in_a_ball/rotations is unused. Idle/rotations are static facing refs only.
 */

import { facingFromDelta, type BearFacing } from './alligatorBear';

export type MewFacing = BearFacing;
export type MewPose = 'idle' | 'walk' | 'roar' | 'aura' | 'kick';

export const MEW_FACINGS: MewFacing[] = [
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

export const MEW_SIZE = 60;
export const MEW_SCALE = 2;
/** Idle + moving cycles draw a bit smaller than the bubble clips. */
export const MEW_IDLE_WALK_DRAW_SCALE = 0.82;
export const MEW_FRAME_TIME = 0.1;
export const MEW_WALK_FRAME_TIME = 0.09;
/** Enter-bubble oneshot. */
export const MEW_TO_BUBBLE_FRAME_TIME = 0.08;
/** Bubble-pop oneshot. */
export const MEW_POP_FRAME_TIME = 0.08;
/** Sink_downward_while_pulling_knees_toward_the_chest oneshot. */
export const MEW_SINK_FRAME_TIME = 0.09;
export const MEW_ATLAS_REV = 5;

const IDLE_FRAME_COUNT = 8;
const WALK_FRAME_COUNT = 13;
const TO_BUBBLE_FRAME_COUNT = 41;
const BUBBLE_WALK_FRAME_COUNT = 13;
const POP_FRAME_COUNT = 25;
const SINK_FRAME_COUNT = 41;

type MewFolder = 'idle' | 'walk' | 'to-bubble' | 'bubble-walk' | 'pop' | 'sink';

function frameUrl(pose: MewFolder, facing: MewFacing, index: number): string {
  const base = import.meta.env.BASE_URL || '/';
  const n = String(index).padStart(3, '0');
  return `${base}critters/mew/${pose}/${facing}/frame_${n}.png`;
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
  canvas.width = img.naturalWidth || MEW_SIZE;
  canvas.height = img.naturalHeight || MEW_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);
  return canvas;
}

async function loadFrameSequence(
  pose: MewFolder,
  facing: MewFacing,
  count: number,
): Promise<HTMLCanvasElement[]> {
  const key = `mew${MEW_ATLAS_REV}:${pose}:${facing}`;
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

export async function loadMewFrames(
  pose: MewPose,
  facing: MewFacing,
  opts?: { bubble?: boolean },
): Promise<HTMLCanvasElement[]> {
  if (pose === 'roar') {
    return loadFrameSequence('to-bubble', 'south', TO_BUBBLE_FRAME_COUNT);
  }
  if (pose === 'aura') {
    return loadFrameSequence('pop', 'south', POP_FRAME_COUNT);
  }
  if (pose === 'kick') {
    return loadFrameSequence('sink', 'south', SINK_FRAME_COUNT);
  }
  if (opts?.bubble) {
    return loadFrameSequence('bubble-walk', facing, BUBBLE_WALK_FRAME_COUNT);
  }
  if (pose === 'idle') {
    return loadFrameSequence('idle', facing, IDLE_FRAME_COUNT);
  }
  return loadFrameSequence('walk', facing, WALK_FRAME_COUNT);
}

export async function preloadMew(): Promise<Map<string, HTMLCanvasElement[]>> {
  const map = new Map<string, HTMLCanvasElement[]>();
  await Promise.all(
    MEW_FACINGS.map(async (facing) => {
      const idle = await loadMewFrames('idle', facing);
      if (idle.length) map.set(`idle:${facing}`, idle);
      const walk = await loadMewFrames('walk', facing);
      if (walk.length) map.set(`walk:${facing}`, walk);
      const bubble = await loadMewFrames('walk', facing, { bubble: true });
      if (bubble.length) map.set(`bubble-walk:${facing}`, bubble);
    }),
  );
  const toBubble = await loadMewFrames('roar', 'south');
  if (toBubble.length) map.set('roar:south', toBubble);
  const pop = await loadMewFrames('aura', 'south');
  if (pop.length) map.set('aura:south', pop);
  const sink = await loadMewFrames('kick', 'south');
  if (sink.length) map.set('kick:south', sink);
  return map;
}
