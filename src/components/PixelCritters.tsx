import { useEffect, useRef, useState } from 'react';
import {
  CRITTERS_EVENT,
  MOTION_EVENT,
  getStoredCritters,
  getStoredMotion,
  type CritterGenre,
  type MotionPref,
} from '../theme';
import {
  ALLIGATOR_BEAR_ATLAS_REV,
  ALLIGATOR_BEAR_FRAME_TIME,
  ALLIGATOR_BEAR_SLEEP_HOLD,
  SLEEP_IDLE_DRAW_SCALE,
  facingFromDelta,
  loadBearFrames,
  preloadAlligatorBear,
  roarGifFacing,
  sleepGifFacing,
  type BearFacing,
  type BearPose,
} from '../data/alligatorBear';
import { CRABACUS_ATLAS_REV, preloadCrabacus } from '../data/crabacus';
import { EMERALD_WYVERN_ATLAS_REV, preloadEmeraldWyvern } from '../data/emeraldWyvern';
import {
  FAE_AURA_AFTER,
  FAE_LAUNCH_COOLDOWN,
  FAE_PRINCESS_ATLAS_REV,
  FAE_SOUTH_KISS_AFTER,
  preloadFaePrincess,
} from '../data/faePrincess';
import {
  fightIdleFacing,
  GOBLIN_MASK_FRAME_TIME,
  GOBLIN_PRIEST_ATLAS_REV,
  preloadGoblinPriest,
} from '../data/goblinPriest';
import {
  RAGNOK_ATLAS_REV,
  RAGNOK_FLAME_FRAME_TIME,
  preloadRagnok,
} from '../data/ragnokHoarder';
import {
  NECROMAGE_ATLAS_REV,
  NECROMAGE_FLAME_FRAME_TIME,
  NECROMAGE_SHADOW_FRAME_TIME,
  preloadNecromage,
} from '../data/necromage';
import {
  GOLEM_ATLAS_REV,
  GOLEM_CHANNEL_FRAME_TIME,
  GOLEM_CHANNEL_DRAW_SCALE,
  GOLEM_IDLE_DRAW_SCALE,
  GOLEM_LIFT_DRAW_SCALE,
  GOLEM_LIFT_FRAME_TIME,
  GOLEM_WALK_DRAW_SCALE,
  preloadGolem,
} from '../data/golem';
import {
  VICTFUR_ATLAS_REV,
  VICTFUR_COAT_FRAME_TIME,
  VICTFUR_HAT_DRAW_SCALE,
  VICTFUR_HAT_FRAME_TIME,
  preloadVictfur,
} from '../data/victfur';
import {
  IRON_GIANT_ATLAS_REV,
  IRON_GIANT_FLASH_FRAME_TIME,
  preloadIronGiant,
} from '../data/ironGiant';
import {
  GHOSTFREAK_ATLAS_REV,
  GHOSTFREAK_SINK_FRAME_TIME,
  GHOSTFREAK_VOID_FRAME_TIME,
  preloadGhostfreak,
} from '../data/ghostfreak';
import {
  MEW_ATLAS_REV,
  MEW_IDLE_WALK_DRAW_SCALE,
  MEW_POP_FRAME_TIME,
  MEW_SINK_FRAME_TIME,
  MEW_TO_BUBBLE_FRAME_TIME,
  MEW_WALK_FRAME_TIME,
  loadMewFrames,
  preloadMew,
  type MewPose,
} from '../data/mew';
import {
  VOID_ATTACK_DRAW_SCALE,
  VOID_ATTACK_FRAME_TIME,
  VOID_WALKER_ATLAS_REV,
  preloadVoidWalker,
} from '../data/voidWalker';
import {
  CRITTERS,
  getCritterGenre,
  renderSpriteFrame,
  spriteSize,
  type CritterId,
  type CritterSprite,
} from '../data/pixelCritters';

/** Stable atlas fingerprint so HMR never changes useEffect dep array length. */
const atlasRev = `${ALLIGATOR_BEAR_ATLAS_REV}:${CRABACUS_ATLAS_REV}:${EMERALD_WYVERN_ATLAS_REV}:${VOID_WALKER_ATLAS_REV}:${GOBLIN_PRIEST_ATLAS_REV}:${FAE_PRINCESS_ATLAS_REV}:${RAGNOK_ATLAS_REV}:${NECROMAGE_ATLAS_REV}:${GOLEM_ATLAS_REV}:${VICTFUR_ATLAS_REV}:${IRON_GIANT_ATLAS_REV}:${GHOSTFREAK_ATLAS_REV}:${MEW_ATLAS_REV}`;

/** Floor-wander atlas companions with frame-driven oneshot flourishes. */
function isFlourishWalker(id: CritterId): boolean {
  return (
    id === 'ragnok' ||
    id === 'necromage' ||
    id === 'golem' ||
    id === 'victfur' ||
    id === 'iron-giant' ||
    id === 'ghostfreak' ||
    id === 'mew'
  );
}

function flourishPeriod(c: Critter): number {
  if (c.sprite.id === 'ragnok' && c.bearPose === 'roar') return RAGNOK_FLAME_FRAME_TIME;
  if (c.sprite.id === 'necromage' && c.bearPose === 'roar') return NECROMAGE_FLAME_FRAME_TIME;
  if (c.sprite.id === 'necromage' && c.bearPose === 'aura') return NECROMAGE_SHADOW_FRAME_TIME;
  if (c.sprite.id === 'golem' && c.bearPose === 'roar') return GOLEM_CHANNEL_FRAME_TIME;
  if (c.sprite.id === 'golem' && c.bearPose === 'aura') return GOLEM_LIFT_FRAME_TIME;
  if (c.sprite.id === 'victfur' && c.bearPose === 'roar') return VICTFUR_COAT_FRAME_TIME;
  if (c.sprite.id === 'victfur' && c.bearPose === 'aura') return VICTFUR_HAT_FRAME_TIME;
  if (c.sprite.id === 'iron-giant' && c.bearPose === 'roar') return IRON_GIANT_FLASH_FRAME_TIME;
  if (c.sprite.id === 'ghostfreak' && c.bearPose === 'roar') return GHOSTFREAK_VOID_FRAME_TIME;
  if (c.sprite.id === 'ghostfreak' && c.bearPose === 'aura') return GHOSTFREAK_SINK_FRAME_TIME;
  if (c.sprite.id === 'mew' && c.bearPose === 'roar') return MEW_TO_BUBBLE_FRAME_TIME;
  if (c.sprite.id === 'mew' && c.bearPose === 'aura') return MEW_POP_FRAME_TIME;
  if (c.sprite.id === 'mew' && c.bearPose === 'kick') return MEW_SINK_FRAME_TIME;
  return c.sprite.frameTime || ALLIGATOR_BEAR_FRAME_TIME;
}

/** Page furniture a companion may land on, walk along, or circle. */
const PERCH_SELECTOR = [
  'main .card',
  'main .card-hover',
  'main .page-header',
  'main h1',
  'main h2',
  'main h3',
  'main .btn-primary',
  'main .btn-secondary',
  'main img',
  'main .input',
  'main .select',
  'main .textarea',
  'aside .wz-wordmark',
].join(', ');

const PERCH_REFRESH_SECONDS = 1.5;
const MAX_DT = 0.05;
const MAX_PARTICLES = 160;

type State = 'roam' | 'approach' | 'perch' | 'orbit' | 'walk' | 'pause' | 'hop';

interface Perch {
  /** Null for the floor of the window. */
  el: Element | null;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Hop {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  t: number;
  dur: number;
  arc: number;
  to: Perch;
}

interface Critter {
  sprite: CritterSprite;
  frames: [HTMLCanvasElement[], HTMLCanvasElement[]];
  w: number;
  h: number;
  x: number;
  y: number;
  facing: 1 | -1;
  frame: number;
  frameClock: number;
  state: State;
  timer: number;
  tx: number;
  ty: number;
  perch: Perch | null;
  perchOffset: number;
  hop: Hop | null;
  phase: number;
  orbitAngle: number;
  orbitRadius: number;
  trailClock: number;
  fireClock: number;
  /** PNG/GIF atlas companions. Values are one or more frames. */
  bearFrames?: Map<string, HTMLCanvasElement[]>;
  bearFacing?: BearFacing;
  bearPose?: BearPose;
  roarTimer?: number;
  roarHold?: number;
  /** Void Walker: face south idle briefly before the sword GIF. */
  flourishWindup?: number;
  /** Fae Princess: committed travel facing (launch + matching fly). */
  faePrevFacing?: BearFacing;
  /** Fae Princess: seconds spent flying south before a kiss. */
  faeSouthClock?: number;
  /** Fae Princess: lockout after a launch so orbit ticks don't teleport her. */
  faeLaunchCool?: number;
  /** Fae Princess: seconds perched before the aura cycle. */
  faeAuraClock?: number;
  /** Facing locked for the current oneshot flourish (flame / conjure / channel). */
  flourishFacing?: BearFacing;
  sleepPause?: boolean;
  /** Seconds until an atlas companion with sleep extras wants another nap. */
  sleepCooldown?: number;
  /** Lie-down → hold still → wake GIF. */
  sleepPhase?: 'lie-down' | 'hold' | 'wake';
  /** Ghostfreak: fade out → stay gone → fade back in. */
  cloakPhase?: 'out' | 'hidden' | 'in';
  /** Ghostfreak draw opacity (0 invisible … 1 solid). */
  cloakAlpha?: number;
  /** Seconds left in the current cloak phase. */
  cloakTimer?: number;
  /** Seconds until the next cloak attempt. */
  cloakCooldown?: number;
  /**
   * Mew bubble sequence (never uses mew_in_a_ball/rotations):
   * south idle → mew_to_bubble → moving_bubble (walk+idle) → face south → pop → idle.
   */
  mewPhase?: 'normal' | 'to-bubble' | 'bubble' | 'pre-pop' | 'pop';
  /** Mew: seconds left rolling in the bubble before facing south / popping. */
  mewBubbleTimer?: number;
  /** Mew: cooldown between south-idle early-burst rolls while bubbled. */
  mewSouthBurstCheck?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  gravity: number;
}

const frameCache = new Map<CritterId, [HTMLCanvasElement[], HTMLCanvasElement[]]>();

function framesFor(sprite: CritterSprite): [HTMLCanvasElement[], HTMLCanvasElement[]] | null {
  if (sprite.imageAtlas) {
    // Placeholder — image companions draw from bearFrames instead.
    const blank = document.createElement('canvas');
    blank.width = 1;
    blank.height = 1;
    return [[blank], [blank]];
  }
  const cached = frameCache.get(sprite.id);
  if (cached) return cached;
  const right: HTMLCanvasElement[] = [];
  const left: HTMLCanvasElement[] = [];
  for (let i = 0; i < sprite.frames.length; i++) {
    const r = renderSpriteFrame(sprite, i, false);
    const l = renderSpriteFrame(sprite, i, true);
    if (!r || !l) return null;
    right.push(r);
    left.push(l);
  }
  const pair: [HTMLCanvasElement[], HTMLCanvasElement[]] = [right, left];
  frameCache.set(sprite.id, pair);
  return pair;
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pickCast(genre: CritterGenre): CritterId[] {
  const info = getCritterGenre(genre);
  if (info.cast.length <= info.count) return [...info.cast];
  const pool = [...info.cast];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, info.count);
}

function floorPerch(): Perch {
  return { el: null, x: 0, y: window.innerHeight - 1, w: window.innerWidth, h: 1 };
}

/** Re-read a perch from the DOM. False when it scrolled away or was removed. */
function refreshPerch(p: Perch): boolean {
  if (!p.el) {
    p.x = 0;
    p.w = window.innerWidth;
    p.y = window.innerHeight - 1;
    return true;
  }
  if (!p.el.isConnected) return false;
  const r = p.el.getBoundingClientRect();
  if (r.width < 24 || r.height < 6) return false;
  if (r.top < 8 || r.top > window.innerHeight - 8 || r.right < 0 || r.left > window.innerWidth) return false;
  p.x = r.left;
  p.y = r.top;
  p.w = r.width;
  p.h = r.height;
  return true;
}

function collectPerches(): Perch[] {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const out: Perch[] = [];
  document.querySelectorAll(PERCH_SELECTOR).forEach((el) => {
    if (el.closest('[role="dialog"]')) return;
    const r = el.getBoundingClientRect();
    if (r.width < 24 || r.height < 6) return;
    if (r.top < 8 || r.top > vh - 8 || r.right < 0 || r.left > vw) return;
    out.push({ el, x: r.left, y: r.top, w: r.width, h: r.height });
  });
  return out;
}

/** Companions stand with their feet a pixel or two into the surface so they read as resting on it. */
function restingY(c: Critter, p: Perch): number {
  return p.y - c.h + c.sprite.scale;
}

function clampToViewport(c: Critter): void {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  c.x = Math.min(Math.max(c.x, -c.w * 0.25), vw - c.w * 0.75);
  c.y = Math.min(Math.max(c.y, 0), vh - c.h);
}

/** Open-floor target so walk-only atlas companions can use all 8 facings. */
function randomFloorTarget(c: Critter): void {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const pad = 12;
  c.tx = rand(pad, Math.max(pad + 1, vw - c.w - pad));
  c.ty = rand(pad, Math.max(pad + 1, vh - c.h - pad));
}

/**
 * Crabacus-style roam: pick points around the window and walk toward them so
 * facingFromDelta sees real dx/dy (not just east/west ledge shuffles).
 */
function mewLockedInFlourish(c: Critter): boolean {
  if (c.sprite.id !== 'mew') return false;
  const phase = c.mewPhase;
  return (
    phase === 'to-bubble' ||
    phase === 'pre-pop' ||
    phase === 'pop' ||
    (c.roarHold ?? 0) > 0
  );
}

/** Lazy-load Mew flourish clips only (never mew_in_a_ball/rotations). */
function ensureMewFlourishFrames(c: Critter, pose: Extract<MewPose, 'roar' | 'aura' | 'kick'>): void {
  if (!c.bearFrames) return;
  const key = `${pose}:south`;
  if (c.bearFrames.has(key)) return;
  void loadMewFrames(pose, 'south').then((frames) => {
    if (frames.length >= 2 && c.bearFrames) c.bearFrames.set(key, frames);
  });
}

function updateFloorWander(c: Critter, dt: number): void {
  switch (c.state) {
    case 'pause': {
      // Don't peel out of a pause mid flame/sword/kick — that cut flourishes short.
      if ((c.roarHold ?? 0) > 0 || (c.flourishWindup ?? 0) > 0 || mewLockedInFlourish(c)) break;
      c.timer -= dt;
      if (c.timer > 0) break;
      randomFloorTarget(c);
      c.state = 'walk';
      c.timer = rand(2.5, 6.5);
      break;
    }
    case 'walk':
    case 'roam':
    case 'approach':
    case 'hop':
    default: {
      // Keep Mew planted while mew_to_bubble / pop / sink play.
      if (mewLockedInFlourish(c)) {
        c.state = 'pause';
        break;
      }
      c.state = 'walk';
      c.timer -= dt;
      const remaining = moveToward(c, dt, c.sprite.speed);
      clampToViewport(c);
      if (remaining < 10 || c.timer <= 0) {
        c.state = 'pause';
        c.timer = rand(0.45, 1.6);
      }
      break;
    }
  }
}

function randomSkyTarget(c: Critter): void {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  c.tx = rand(0, Math.max(1, vw - c.w));
  const maxY = c.sprite.skyward ? vh * 0.45 : vh - c.h;
  c.ty = rand(0, Math.max(1, maxY));
}

function moveToward(c: Critter, dt: number, speed: number): number {
  const dx = c.tx - c.x;
  const dy = c.ty - c.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.001) return 0;
  const step = Math.min(dist, speed * dt);
  c.x += (dx / dist) * step;
  c.y += (dy / dist) * step;
  if (Math.abs(dx) > 2) c.facing = dx > 0 ? 1 : -1;
  if (c.sprite.imageAtlas) c.bearFacing = facingFromDelta(dx, dy);
  return dist - step;
}

function makeCritter(id: CritterId, bearFrames?: Map<string, HTMLCanvasElement[]>): Critter | null {
  const sprite = CRITTERS[id];
  if (sprite.imageAtlas && !bearFrames) return null;
  const frames = framesFor(sprite);
  if (!frames) return null;
  const size = spriteSize(sprite);
  const w = size.w * sprite.scale;
  const h = size.h * sprite.scale;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const c: Critter = {
    sprite,
    frames,
    w,
    h,
    x: rand(0, Math.max(1, vw - w)),
    y: rand(0, Math.max(1, vh - h)),
    facing: Math.random() < 0.5 ? 1 : -1,
    frame: 0,
    frameClock: Math.random() * sprite.frameTime,
    bearFrames,
    bearFacing: Math.random() < 0.5 ? 'east' : 'west',
    bearPose: 'idle',
    roarTimer:
      sprite.id === 'mew'
        ? rand(3, 6)
        : sprite.atlasExtras ||
            sprite.id === 'void-walker' ||
            sprite.id === 'goblin-priest' ||
            isFlourishWalker(sprite.id)
          ? rand(5, 12)
          : undefined,
    roarHold: 0,
    flourishWindup: 0,
    faePrevFacing: undefined,
    faeSouthClock: 0,
    faeLaunchCool: 0,
    faeAuraClock: 0,
    flourishFacing: undefined,
    sleepPause: false,
    sleepPhase: undefined,
    // Sleep cycle is Alligator Bear only.
    sleepCooldown: sprite.id === 'alligator-bear' ? rand(6, 12) : undefined,
    cloakPhase: undefined,
    cloakAlpha: 1,
    cloakTimer: 0,
    cloakCooldown: sprite.id === 'ghostfreak' ? rand(7, 14) : undefined,
    mewPhase: sprite.id === 'mew' ? 'normal' : undefined,
    mewBubbleTimer: 0,
    mewSouthBurstCheck: 0,
    state: sprite.kind === 'flyer' ? 'roam' : 'walk',
    timer: rand(1.5, 4),
    tx: 0,
    ty: 0,
    perch: null,
    perchOffset: 0,
    hop: null,
    phase: Math.random() * Math.PI * 2,
    orbitAngle: 0,
    orbitRadius: 0,
    trailClock: 0,
    fireClock: rand(3, 8),
  };
  if (sprite.kind === 'flyer') {
    randomSkyTarget(c);
  } else if (sprite.imageAtlas && !sprite.hops) {
    // Free roam across the window so all walk facings get used.
    randomFloorTarget(c);
    c.perch = null;
  } else {
    c.perch = floorPerch();
    c.perchOffset = c.x - c.perch.x;
    c.y = restingY(c, c.perch);
  }
  return c;
}

function surfacesFor(c: Critter, perches: Perch[]): Perch[] {
  const minWidth = c.sprite.skyward ? c.w * 1.1 : c.w * 0.6;
  return perches.filter((p) => p.w >= minWidth);
}

function pickPerch(c: Critter, perches: Perch[], maxDistance: number): Perch | null {
  const candidates = surfacesFor(c, perches).filter((p) => p !== c.perch);
  if (candidates.length === 0) return null;
  const cx = c.x + c.w / 2;
  const cy = c.y + c.h;
  const near = candidates.filter((p) => {
    const px = Math.min(Math.max(cx, p.x), p.x + p.w);
    return Math.hypot(px - cx, p.y - cy) <= maxDistance;
  });
  const pool = near.length > 0 ? near : candidates;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

function startApproach(c: Critter, p: Perch): void {
  c.perch = p;
  c.perchOffset = rand(0, Math.max(0, p.w - c.w));
  c.state = 'approach';
  c.timer = rand(4, 7);
}

function startHop(c: Critter, to: Perch): void {
  const x1 = to.x + Math.min(Math.max(c.perchOffset, 0), Math.max(0, to.w - c.w));
  const y1 = restingY(c, to);
  const dx = x1 - c.x;
  const dy = y1 - c.y;
  const dist = Math.hypot(dx, dy);
  const hops = Boolean(c.sprite.hops);
  const dur = hops ? Math.min(1.2, 0.45 + dist / 700) : Math.max(0.5, dist / (c.sprite.speed * 2.2));
  c.hop = {
    x0: c.x,
    y0: c.y,
    x1,
    y1,
    t: 0,
    dur,
    arc: hops ? Math.max(28, Math.abs(dy) * 0.35 + 36) : 0,
    to,
  };
  c.facing = dx >= 0 ? 1 : -1;
  if (c.sprite.imageAtlas) c.bearFacing = facingFromDelta(dx, dy);
  c.state = 'hop';
}

const GHOSTFREAK_CLOAK_FADE = 0.75;

/** Ghostfreak drifts invisible for a beat, then fades back in. */
function updateGhostfreakCloak(c: Critter, dt: number): void {
  if (c.sprite.id !== 'ghostfreak') return;

  const busyFlourish = (c.roarHold ?? 0) > 0 || (c.flourishWindup ?? 0) > 0;
  if (busyFlourish) {
    // Finish any in-progress cloak cleanly once the flourish ends.
    if (!c.cloakPhase) return;
  }

  if (!c.cloakPhase) {
    if (busyFlourish) return;
    if (c.state !== 'walk' && c.state !== 'pause' && c.state !== 'approach') return;
    c.cloakCooldown = (c.cloakCooldown ?? 10) - dt;
    if ((c.cloakCooldown ?? 0) > 0) return;
    c.cloakPhase = 'out';
    c.cloakTimer = GHOSTFREAK_CLOAK_FADE;
    c.cloakAlpha = 1;
    return;
  }

  if (c.cloakPhase === 'out') {
    c.cloakTimer = (c.cloakTimer ?? GHOSTFREAK_CLOAK_FADE) - dt;
    c.cloakAlpha = Math.max(0, (c.cloakTimer ?? 0) / GHOSTFREAK_CLOAK_FADE);
    if ((c.cloakTimer ?? 0) <= 0) {
      c.cloakPhase = 'hidden';
      c.cloakTimer = rand(1.1, 2.6);
      c.cloakAlpha = 0;
      // Slip a short distance while unseen so reappear feels like a blink.
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const jump = rand(48, 140) * (Math.random() < 0.5 ? -1 : 1);
      c.x = Math.max(0, Math.min(Math.max(1, vw - c.w), c.x + jump));
      c.y = Math.max(0, Math.min(Math.max(1, vh - c.h), c.y + rand(-24, 24)));
    }
    return;
  }

  if (c.cloakPhase === 'hidden') {
    c.cloakTimer = (c.cloakTimer ?? 0) - dt;
    c.cloakAlpha = 0;
    if ((c.cloakTimer ?? 0) <= 0) {
      c.cloakPhase = 'in';
      c.cloakTimer = GHOSTFREAK_CLOAK_FADE;
      c.cloakAlpha = 0;
    }
    return;
  }

  // 'in'
  c.cloakTimer = (c.cloakTimer ?? GHOSTFREAK_CLOAK_FADE) - dt;
  c.cloakAlpha = Math.min(1, 1 - (c.cloakTimer ?? 0) / GHOSTFREAK_CLOAK_FADE);
  if ((c.cloakTimer ?? 0) <= 0) {
    c.cloakPhase = undefined;
    c.cloakAlpha = 1;
    c.cloakCooldown = rand(9, 18);
  }
}

function emitTrail(c: Critter, particles: Particle[], dt: number): void {
  if (!c.sprite.trail) return;
  c.trailClock -= dt;
  if (c.trailClock > 0) return;
  c.trailClock = 0.07;
  if (particles.length >= MAX_PARTICLES) return;
  const s = c.sprite.scale;
  particles.push({
    x: c.x + c.w / 2 + rand(-s * 2, s * 2),
    y: c.y + c.h * 0.7 + rand(-s, s),
    vx: rand(-8, 8) - c.facing * 10,
    vy: rand(6, 20),
    life: 0,
    max: rand(0.5, 0.9),
    size: s,
    color: c.sprite.trail,
    gravity: 0,
  });
}

function emitFire(c: Critter, particles: Particle[]): void {
  const s = c.sprite.scale;
  const mouthX = c.facing > 0 ? c.x + c.w - s * 2 : c.x + s * 2;
  const mouthY = c.y + c.h * 0.5;
  const colors = ['#fb923c', '#f97316', '#fde047', '#ef4444'];
  for (let i = 0; i < 12 && particles.length < MAX_PARTICLES; i++) {
    particles.push({
      x: mouthX,
      y: mouthY + rand(-s, s),
      vx: c.facing * rand(60, 140) + rand(-10, 10),
      vy: rand(-30, 10),
      life: 0,
      max: rand(0.35, 0.7),
      size: s,
      color: colors[i % colors.length]!,
      gravity: -40,
    });
  }
}

/**
 * Fae Princess: smooth sky roam only — no perch snaps, no orbit teleports, no hops.
 * Occasional midair hover (state `perch` without a DOM perch) so the aura can play.
 */
function updateFaePrincess(c: Critter, dt: number, particles: Particle[]): void {
  c.phase += dt * 2.2;
  // Drop any leftover orbit/approach from older movement so she never jumps onto cards.
  if (c.state === 'orbit' || c.state === 'approach' || c.state === 'hop') {
    c.perch = null;
    c.hop = null;
    c.state = 'roam';
    randomSkyTarget(c);
    c.timer = rand(2, 4);
  }

  if (c.state === 'perch') {
    // Hover in place — keep current sky position; gentle bob only.
    c.timer -= dt;
    c.y += Math.sin(c.phase) * 5 * dt;
    clampToViewport(c);
    emitTrail(c, particles, dt * 0.4);
    if (c.timer <= 0) {
      c.state = 'roam';
      randomSkyTarget(c);
      c.timer = rand(2.5, 5);
    }
    return;
  }

  c.state = 'roam';
  c.timer -= dt;
  const remaining = moveToward(c, dt, c.sprite.speed);
  c.y += Math.sin(c.phase) * 8 * dt;
  clampToViewport(c);
  emitTrail(c, particles, dt);
  if (remaining < 10 || c.timer <= 0) {
    if (Math.random() < 0.32) {
      // Pause midair for aura / flutter — never snap to a UI ledge.
      c.perch = null;
      c.state = 'perch';
      c.timer = rand(3.2, 6);
    } else {
      randomSkyTarget(c);
      c.timer = rand(2.5, 5.5);
    }
  }
}

function updateFlyer(c: Critter, dt: number, perches: Perch[], particles: Particle[]): void {
  if (c.sprite.id === 'fae-princess') {
    updateFaePrincess(c, dt, particles);
    return;
  }
  c.phase += dt * 3;
  switch (c.state) {
    case 'roam': {
      c.timer -= dt;
      const remaining = moveToward(c, dt, c.sprite.speed);
      c.y += Math.sin(c.phase) * 14 * dt;
      clampToViewport(c);
      emitTrail(c, particles, dt);
      if (c.sprite.breathesFire) {
        c.fireClock -= dt;
        if (c.fireClock <= 0) {
          c.fireClock = rand(5, 11);
          emitFire(c, particles);
        }
      }
      if (remaining < 10 || c.timer <= 0) {
        const roll = Math.random();
        const perch = roll < 0.5 ? pickPerch(c, perches, 520) : null;
        if (perch) {
          startApproach(c, perch);
        } else if (c.sprite.trail && roll < 0.75) {
          const target = pickPerch(c, perches, 420);
          if (target) {
            c.perch = target;
            c.state = 'orbit';
            c.timer = rand(2.5, 5);
            c.orbitRadius = Math.max(c.w, Math.min(target.w / 2, 90));
            c.orbitAngle = Math.random() * Math.PI * 2;
            break;
          }
          randomSkyTarget(c);
          c.timer = rand(2, 5);
        } else {
          randomSkyTarget(c);
          c.timer = rand(2, 5);
        }
      }
      break;
    }
    case 'approach': {
      c.timer -= dt;
      const p = c.perch;
      if (!p || !refreshPerch(p) || c.timer <= 0) {
        c.perch = null;
        c.state = 'roam';
        randomSkyTarget(c);
        c.timer = rand(2, 5);
        break;
      }
      c.tx = p.x + Math.min(c.perchOffset, Math.max(0, p.w - c.w));
      c.ty = restingY(c, p);
      const remaining = moveToward(c, dt, c.sprite.speed * 1.1);
      emitTrail(c, particles, dt);
      if (remaining < 3) {
        c.x = c.tx;
        c.y = c.ty;
        c.state = 'perch';
        c.timer = rand(2.5, 7);
      }
      break;
    }
    case 'perch': {
      c.timer -= dt;
      const p = c.perch;
      if (!p || !refreshPerch(p) || c.timer <= 0) {
        c.perch = null;
        c.state = 'roam';
        randomSkyTarget(c);
        c.ty = Math.min(c.ty, Math.max(0, c.y - 60));
        c.timer = rand(2, 5);
        break;
      }
      c.x = p.x + Math.min(c.perchOffset, Math.max(0, p.w - c.w));
      c.y = restingY(c, p);
      break;
    }
    case 'orbit': {
      c.timer -= dt;
      const p = c.perch;
      if (!p || !refreshPerch(p) || c.timer <= 0) {
        c.perch = null;
        c.state = 'roam';
        randomSkyTarget(c);
        c.timer = rand(2, 5);
        break;
      }
      const prevX = c.x;
      c.orbitAngle += dt * (c.sprite.speed / Math.max(40, c.orbitRadius)) * 1.4;
      const cx = p.x + p.w / 2;
      const cy = p.y + Math.min(p.h / 2, 24);
      c.x = cx + Math.cos(c.orbitAngle) * c.orbitRadius - c.w / 2;
      c.y = cy + Math.sin(c.orbitAngle) * c.orbitRadius * 0.45 - c.h / 2;
      if (Math.abs(c.x - prevX) > 0.5) c.facing = c.x > prevX ? 1 : -1;
      if (c.sprite.imageAtlas) {
        const dx = Math.cos(c.orbitAngle);
        const dy = Math.sin(c.orbitAngle) * 0.45;
        c.bearFacing = facingFromDelta(dx, dy);
      }
      clampToViewport(c);
      emitTrail(c, particles, dt);
      break;
    }
    default:
      c.state = 'roam';
      randomSkyTarget(c);
  }
}

function landSomewhere(c: Critter, perches: Perch[]): void {
  const below = surfacesFor(c, perches).filter((p) => p.y >= c.y + c.h - 4);
  const target = below.length > 0 ? below[Math.floor(Math.random() * below.length)]! : floorPerch();
  c.perchOffset = Math.min(Math.max(c.x - target.x, 0), Math.max(0, target.w - c.w));
  // Walk-only companions (Crabacus) snap onto a ledge — no hop / jump pose.
  if (!c.sprite.hops) {
    c.hop = null;
    c.perch = target;
    c.x = target.x + c.perchOffset;
    c.y = restingY(c, target);
    c.state = 'walk';
    c.timer = rand(2, 6);
    return;
  }
  startHop(c, target);
  if (c.hop) c.hop.arc = 0;
}

function beginBearSleep(c: Critter): void {
  c.sleepPause = true;
  c.sleepPhase = 'lie-down';
  c.bearPose = 'sleep';
  c.bearFacing = sleepGifFacing(c.bearFacing ?? 'south');
  c.frame = 0;
  c.frameClock = 0;
  // Pause stays open through lie-down → 15s hold → wake GIF.
  c.timer = Number.POSITIVE_INFINITY;
  c.sleepCooldown = rand(20, 35);
}

function ensureBearPoseFrames(c: Critter, pose: BearPose, facing: BearFacing): void {
  if (!c.bearFrames) return;
  const key = `${pose}:${facing}`;
  if (c.bearFrames.has(key)) return;
  void loadBearFrames(pose, facing).then((frames) => {
    if (frames.length && c.bearFrames) c.bearFrames.set(key, frames);
  });
}

function wakeFrameList(c: Critter): HTMLCanvasElement[] | undefined {
  if (!c.bearFrames) return undefined;
  const facing = sleepGifFacing(c.bearFacing ?? 'south');
  return c.bearFrames.get(`wake:${facing}`) ?? c.bearFrames.get(`wake:south`);
}

function beginBearWake(c: Critter): void {
  const facing = sleepGifFacing(c.bearFacing ?? 'south');
  c.bearFacing = facing;
  ensureBearPoseFrames(c, 'wake', facing);
  c.sleepPhase = 'wake';
  c.bearPose = 'wake';
  c.frame = 0;
  c.frameClock = 0;
  c.timer = Number.POSITIVE_INFINITY;
}

function updateGround(c: Critter, dt: number, perches: Perch[]): void {
  if (c.sprite.imageAtlas && !c.sleepPause && c.sleepCooldown != null) {
    c.sleepCooldown = Math.max(0, c.sleepCooldown - dt);
  }
  // Walk-only atlas companions roam the floor in 8 directions (no ledge hopping).
  if (c.sprite.imageAtlas && !c.sprite.hops) {
    updateFloorWander(c, dt);
    return;
  }
  switch (c.state) {
    case 'walk': {
      const p = c.perch;
      if (!p || !refreshPerch(p)) {
        landSomewhere(c, perches);
        break;
      }
      c.timer -= dt;
      c.x += c.facing * c.sprite.speed * dt;
      if (c.sprite.imageAtlas) c.bearFacing = facingFromDelta(c.facing, 0);
      c.y = restingY(c, p);
      const minX = p.x;
      const maxX = p.x + p.w - c.w;
      let atEdge = false;
      if (c.x <= minX) {
        c.x = minX;
        atEdge = true;
      } else if (c.x >= maxX) {
        c.x = maxX;
        atEdge = true;
      }
      c.perchOffset = c.x - p.x;
      if (atEdge || c.timer <= 0) {
        c.state = 'pause';
        // Nap only for atlas companions that have sleep GIFs (Alligator Bear).
        if (c.sprite.id === 'alligator-bear' && c.sleepCooldown != null && c.sleepCooldown <= 0) {
          beginBearSleep(c);
        } else {
          c.sleepPause = false;
          c.timer = atEdge ? rand(0.6, 2) : rand(0.4, 1.2);
        }
      }
      break;
    }
    case 'pause': {
      const p = c.perch;
      if (!p || !refreshPerch(p)) {
        c.sleepPause = false;
        c.sleepPhase = undefined;
        landSomewhere(c, perches);
        break;
      }
      c.x = p.x + c.perchOffset;
      c.y = restingY(c, p);
      // Lie-down / wake GIFs are driven by advanceFrame; only tick the 15s hold.
      if (c.sleepPause && (c.sleepPhase === 'lie-down' || c.sleepPhase === 'wake')) break;
      c.timer -= dt;
      if (c.timer > 0) break;
      if (c.sleepPause && c.sleepPhase === 'hold') {
        beginBearWake(c);
        break;
      }
      c.sleepPause = false;
      c.sleepPhase = undefined;
      // Hoppers may leap to another ledge; walk-only critters stay put and turn around.
      const next =
        c.sprite.hops && Math.random() < 0.55 ? pickPerch(c, perches, 460) : null;
      if (next) {
        c.perchOffset = rand(0, Math.max(0, next.w - c.w));
        startHop(c, next);
      } else {
        const minX = p.x;
        const maxX = p.x + p.w - c.w;
        if (c.x <= minX + 1) c.facing = 1;
        else if (c.x >= maxX - 1) c.facing = -1;
        else if (Math.random() < 0.4) c.facing = c.facing === 1 ? -1 : 1;
        c.state = 'walk';
        c.timer = rand(2, 6);
      }
      break;
    }
    case 'hop': {
      const hop = c.hop;
      if (!hop) {
        c.state = 'walk';
        break;
      }
      if (!refreshPerch(hop.to)) {
        c.hop = null;
        c.perch = floorPerch();
        landSomewhere(c, perches);
        break;
      }
      hop.x1 = hop.to.x + Math.min(Math.max(c.perchOffset, 0), Math.max(0, hop.to.w - c.w));
      hop.y1 = restingY(c, hop.to);
      hop.t = Math.min(1, hop.t + dt / hop.dur);
      const t = hop.t;
      const ease = hop.arc > 0 ? t : t * t * (3 - 2 * t);
      c.x = hop.x0 + (hop.x1 - hop.x0) * ease;
      c.y = hop.y0 + (hop.y1 - hop.y0) * ease - hop.arc * Math.sin(Math.PI * t);
      if (c.sprite.imageAtlas) c.bearFacing = facingFromDelta(hop.x1 - hop.x0, hop.y1 - hop.y0);
      if (t >= 1) {
        c.perch = hop.to;
        c.perchOffset = c.x - hop.to.x;
        c.hop = null;
        if (c.sprite.id === 'alligator-bear' && c.sleepCooldown != null && c.sleepCooldown <= 0) {
          c.state = 'pause';
          beginBearSleep(c);
        } else {
          c.state = 'walk';
          c.timer = rand(2, 6);
        }
      }
      break;
    }
    default:
      c.state = 'walk';
  }
}

function bearFrameList(c: Critter): HTMLCanvasElement[] | undefined {
  if (!c.bearFrames) return undefined;
  const pose = c.bearPose ?? 'idle';
  const facing = c.bearFacing ?? 'south';
  const sleepFacing = sleepGifFacing(facing);
  // Special poses must not fall back to idle/walk — that looked like skipping wake.
  if (pose === 'sleep') return c.bearFrames.get(`sleep:${facing}`) ?? c.bearFrames.get(`sleep:${sleepFacing}`);
  if (pose === 'wake') return wakeFrameList(c);
  if (pose === 'jump') {
    return c.bearFrames.get(`jump:${facing}`) ?? c.bearFrames.get('jump:south') ?? c.bearFrames.get(`walk:${facing}`);
  }
  if (pose === 'sleep-idle') {
    return (
      c.bearFrames.get(`sleep-idle:${facing}`) ??
      c.bearFrames.get(`sleep-idle:${sleepFacing}`) ??
      c.bearFrames.get(`sleep:${sleepFacing}`)
    );
  }
  if (pose === 'roar') {
    // Flourish walkers keep locked/south roar clips; bear roar GIFs remap north.
    if (isFlourishWalker(c.sprite.id)) {
      const locked = c.flourishFacing ?? facing;
      const flame =
        c.bearFrames.get(`roar:${locked}`) ?? c.bearFrames.get('roar:south');
      return flame?.length ? flame : undefined;
    }
    return c.bearFrames.get(`roar:${roarGifFacing(facing)}`);
  }
  if (pose === 'kick') {
    return c.bearFrames.get(`kick:${facing}`) ?? c.bearFrames.get('kick:south');
  }
  if (pose === 'mask') {
    return c.bearFrames.get('mask:south') ?? c.bearFrames.get(`mask:${facing}`);
  }
  if (pose === 'launch') {
    return c.bearFrames.get(`launch:${facing}`) ?? c.bearFrames.get('launch:south');
  }
  if (pose === 'kiss') {
    return c.bearFrames.get('kiss:south') ?? c.bearFrames.get(`kiss:${facing}`);
  }
  if (pose === 'aura') {
    return c.bearFrames.get(`aura:${facing}`) ?? c.bearFrames.get('aura:south');
  }
  if (pose === 'idle' && c.sprite.id === 'goblin-priest') {
    const snap = fightIdleFacing(facing);
    return (
      c.bearFrames.get(`idle:${snap}`) ??
      c.bearFrames.get('idle:south') ??
      c.bearFrames.get(`walk:${facing}`)
    );
  }
  // Bubble / pre-pop: moving_bubble is both walk and idle (no ball-rotation folder).
  if (
    c.sprite.id === 'mew' &&
    (c.mewPhase === 'bubble' || c.mewPhase === 'pre-pop') &&
    (pose === 'walk' || pose === 'idle')
  ) {
    const face = c.mewPhase === 'pre-pop' ? 'south' : facing;
    return (
      c.bearFrames.get(`bubble-walk:${face}`) ??
      c.bearFrames.get('bubble-walk:south')
    );
  }
  return (
    c.bearFrames.get(`${pose}:${facing}`) ??
    c.bearFrames.get(`idle:${facing}`) ??
    c.bearFrames.get(`walk:${facing}`) ??
    c.bearFrames.get('idle:south') ??
    c.bearFrames.get('walk:south')
  );
}

function syncBearPose(c: Critter, dt: number): void {
  // Fae Princess: launch → fly same heading; kiss while flying south; aura on midair hover.
  // Movement is sky-roam only (no orbit/card snaps).
  if (c.sprite.id === 'fae-princess') {
    c.faeLaunchCool = Math.max(0, (c.faeLaunchCool ?? 0) - dt);
    const moving = c.state === 'roam';
    if (
      (c.roarHold ?? 0) > 0 &&
      (c.bearPose === 'launch' || c.bearPose === 'kiss' || c.bearPose === 'aura')
    ) {
      c.roarHold = (c.roarHold ?? 0) - dt;
      // Keep the oneshot facing stable while movement keeps updating bearFacing.
      if (c.bearPose === 'kiss') c.bearFacing = 'south';
      else if (c.bearPose === 'launch' && c.faePrevFacing) c.bearFacing = c.faePrevFacing;
      if ((c.roarHold ?? 0) <= 0) {
        const finished = c.bearPose;
        c.roarHold = 0;
        if (finished === 'launch') c.faeLaunchCool = FAE_LAUNCH_COOLDOWN;
        // Launch → fly keeps the same committed facing (east launch → east fly, etc.).
        if (finished === 'launch' && c.faePrevFacing) c.bearFacing = c.faePrevFacing;
        else if (finished !== 'launch') c.faePrevFacing = undefined;
        c.bearPose = moving ? 'walk' : 'idle';
        c.faeSouthClock = 0;
        c.faeAuraClock = 0;
        c.frame = 0;
        c.frameClock = 0;
      }
      return;
    }
    if (moving) {
      const liveFacing = c.bearFacing ?? 'south';
      const canLaunch =
        (c.faeLaunchCool ?? 0) <= 0 &&
        Boolean(c.faePrevFacing) &&
        c.faePrevFacing !== liveFacing;
      if (canLaunch) {
        const hold =
          (c.bearFrames?.get(`launch:${liveFacing}`)?.length ?? 9) * (c.sprite.frameTime || 0.08);
        c.bearPose = 'launch';
        c.bearFacing = liveFacing;
        c.roarHold = hold;
        c.faePrevFacing = liveFacing;
        c.faeSouthClock = 0;
        c.faeAuraClock = 0;
        c.frame = 0;
        c.frameClock = 0;
        return;
      }
      // Hold the committed travel facing through the fly loop (launch east → fly east).
      if (!c.faePrevFacing) c.faePrevFacing = liveFacing;
      c.bearFacing = c.faePrevFacing;
      c.bearPose = 'walk';
      c.faeAuraClock = 0;
      if (c.faePrevFacing === 'south') {
        c.faeSouthClock = (c.faeSouthClock ?? 0) + dt;
        if ((c.faeSouthClock ?? 0) >= FAE_SOUTH_KISS_AFTER) {
          const hold = (c.bearFrames?.get('kiss:south')?.length ?? 9) * (c.sprite.frameTime || 0.08);
          c.bearPose = 'kiss';
          c.bearFacing = 'south';
          c.roarHold = hold;
          c.faeSouthClock = 0;
          c.frame = 0;
          c.frameClock = 0;
        }
      } else {
        c.faeSouthClock = 0;
      }
      return;
    }
    // Midair hover: flutter, then the glowing aura cycle.
    const facing = c.bearFacing ?? 'south';
    c.faePrevFacing = facing;
    c.faeSouthClock = 0;
    c.faeAuraClock = (c.faeAuraClock ?? 0) + dt;
    if ((c.faeAuraClock ?? 0) >= FAE_AURA_AFTER) {
      const hold =
        (c.bearFrames?.get(`aura:${facing}`)?.length ?? 41) * (c.sprite.frameTime || 0.08);
      c.bearPose = 'aura';
      c.roarHold = hold;
      c.faeAuraClock = 0;
      c.frame = 0;
      c.frameClock = 0;
      return;
    }
    c.bearPose = 'idle';
    return;
  }

  // Void Walker: south idle beat, then sword GIF, then peel off walking south.
  if ((c.flourishWindup ?? 0) > 0) {
    c.flourishWindup = (c.flourishWindup ?? 0) - dt;
    c.bearFacing = 'south';
    c.bearPose = 'idle';
    if ((c.flourishWindup ?? 0) <= 0) {
      c.flourishWindup = 0;
      const flourish = (c.bearFrames?.get('roar:south')?.length ?? 12) * VOID_ATTACK_FRAME_TIME;
      c.roarHold = flourish;
      c.bearPose = 'roar';
      c.frame = 0;
      c.frameClock = 0;
    }
    return;
  }
  // One-shot flourish (sword / kick / mask) — hold through the full clip.
  if ((c.roarHold ?? 0) > 0) {
    // Flourish walkers are frame-driven (oneshot below) — don't kill on wall-clock.
    if (isFlourishWalker(c.sprite.id)) {
      const pose =
        c.sprite.id === 'mew' && c.bearPose === 'kick'
          ? 'kick'
          : c.bearPose === 'aura'
            ? 'aura'
            : 'roar';
      const locked =
        c.flourishFacing ??
        (c.sprite.id === 'ragnok' ? c.bearFacing ?? 'south' : 'south');
      const frames =
        c.bearFrames?.get(`${pose}:${locked}`) ?? c.bearFrames?.get(`${pose}:south`);
      if (!frames?.length) {
        c.roarHold = 0;
        c.bearPose = 'idle';
        c.flourishFacing = undefined;
        if (c.sprite.id === 'mew') c.mewPhase = 'normal';
        c.roarTimer = rand(4, 8);
        c.frame = 0;
        c.frameClock = 0;
        return;
      }
      c.bearPose = pose;
      c.bearFacing = locked;
      c.flourishFacing = locked;
      return;
    }
    c.roarHold = (c.roarHold ?? 0) - dt;
    if ((c.roarHold ?? 0) <= 0) {
      c.roarHold = 0;
      if (c.sprite.id === 'void-walker') {
        c.bearFacing = 'south';
        c.bearPose = 'walk';
        c.state = 'walk';
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        c.tx = Math.min(Math.max(c.x + rand(-36, 36), 0), Math.max(0, vw - c.w));
        c.ty = Math.min(Math.max(c.y + rand(70, 150), 0), Math.max(0, vh - c.h));
        c.timer = rand(2.5, 4.5);
        c.frame = 0;
        c.frameClock = 0;
        return;
      }
      if (c.sprite.id === 'goblin-priest') {
        if (c.bearPose === 'mask') {
          c.bearPose = 'walk';
          c.state = 'walk';
          c.timer = rand(2.5, 5);
          c.roarTimer = rand(10, 18);
        } else {
          // Kick finished → back to fight stance.
          c.bearFacing = fightIdleFacing(c.bearFacing ?? 'south');
          c.bearPose = 'idle';
          c.roarTimer = rand(4, 9);
          c.timer = Math.max(c.timer, rand(1.5, 3));
        }
        c.frame = 0;
        c.frameClock = 0;
        return;
      }
    }
    if (c.sprite.id === 'void-walker') {
      c.bearPose = 'roar';
      c.bearFacing = 'south';
    } else if (c.sprite.id === 'goblin-priest') {
      // Keep kick/mask pose while the hold runs.
      if (c.bearPose === 'mask') c.bearFacing = 'south';
    } else {
      c.bearPose = 'roar';
      c.bearFacing = roarGifFacing(c.bearFacing ?? 'south');
    }
    return;
  }
  if (c.state === 'hop') {
    c.bearPose = c.sprite.hops ? 'jump' : 'walk';
    return;
  }

  // Mew: moving_bubble → face south in bubble → pop burst → south idle.
  // Always return while in these phases so pause/flourish logic can't skip the burst.
  // Uses bubble-walk + pop only — never mew_in_a_ball/rotations.
  if (c.sprite.id === 'mew' && (c.roarHold ?? 0) <= 0) {
    if (c.mewPhase === 'bubble') {
      c.mewBubbleTimer = (c.mewBubbleTimer ?? 0) - dt;
      if ((c.mewBubbleTimer ?? 0) <= 0) {
        // Must face south in the bubble before the pop clip.
        c.mewPhase = 'pre-pop';
        c.bearFacing = 'south';
        c.flourishFacing = 'south';
        c.bearPose = 'idle';
        c.state = 'pause';
        c.mewBubbleTimer = rand(0.9, 1.35);
        c.frame = 0;
        c.frameClock = 0;
        c.timer = Math.max(c.timer, 1.6);
        ensureMewFlourishFrames(c, 'aura');
        return;
      }
      // Keep rolling in moving_bubble; do not fall through into flourish starters.
      c.bearPose = c.state === 'walk' || c.state === 'approach' ? 'walk' : 'idle';
      return;
    }
    if (c.mewPhase === 'pre-pop') {
      c.bearFacing = 'south';
      c.flourishFacing = 'south';
      c.bearPose = 'idle';
      c.state = 'pause';
      c.mewBubbleTimer = (c.mewBubbleTimer ?? 0) - dt;
      if ((c.mewBubbleTimer ?? 0) > 0) return;
      const frames = c.bearFrames?.get('aura:south');
      if (!frames || frames.length < 2) {
        // Stay facing south in-bubble until pop frames are ready — never skip the burst.
        ensureMewFlourishFrames(c, 'aura');
        c.mewBubbleTimer = 0.35;
        c.timer = Math.max(c.timer, 0.6);
        return;
      }
      c.mewPhase = 'pop';
      c.bearPose = 'aura';
      c.bearFacing = 'south';
      c.flourishFacing = 'south';
      c.roarHold = frames.length * MEW_POP_FRAME_TIME + 0.35;
      c.state = 'pause';
      c.timer = Math.max(c.timer, (c.roarHold ?? 0) + 2);
      c.frame = 0;
      c.frameClock = 0;
      return;
    }
    if (c.mewPhase === 'pop') {
      // roarHold should own the clip; if it cleared early, recover into south idle.
      c.mewPhase = 'normal';
      c.bearFacing = 'south';
      c.bearPose = 'idle';
      c.state = 'pause';
      c.timer = Math.max(c.timer, rand(2.2, 3.4));
      c.roarTimer = rand(4, 7);
      c.frame = 0;
      c.frameClock = 0;
      return;
    }
  }

  if (c.state === 'walk' || c.state === 'approach') {
    c.bearPose = 'walk';
    if (c.roarTimer != null) c.roarTimer = (c.roarTimer ?? 8) - dt;
    return;
  }
  if (c.state === 'pause' && c.sleepPause) {
    if (c.sleepPhase === 'wake') {
      // Keep the sleep still on screen until wake frames are actually loaded.
      c.bearPose = wakeFrameList(c)?.length ? 'wake' : 'sleep-idle';
    } else if (c.sleepPhase === 'hold') {
      c.bearPose = 'sleep-idle';
    } else {
      c.bearPose = 'sleep';
    }
    return;
  }

  // Occasional roar / sword-draw / goblin flourish while idling.
  if (c.state === 'pause' && c.roarTimer != null) {
    c.roarTimer = (c.roarTimer ?? 8) - dt;
    if ((c.roarTimer ?? 0) <= 0) {
      const isVoid = c.sprite.id === 'void-walker';
      const isGoblin = c.sprite.id === 'goblin-priest';
      c.frame = 0;
      c.frameClock = 0;
      if (isVoid) {
        const flourish = (c.bearFrames?.get('roar:south')?.length ?? 12) * VOID_ATTACK_FRAME_TIME;
        const windup = Math.max(1.1, (c.sprite.frameTime || 0.12) * 8);
        c.roarTimer = rand(12, 20);
        c.bearFacing = 'south';
        c.bearPose = 'idle';
        c.flourishWindup = windup;
        c.roarHold = 0;
        c.timer = Math.max(c.timer, windup + flourish + 0.4);
      } else if (isFlourishWalker(c.sprite.id)) {
        // Don't start a void/sink clip while Ghostfreak is mid-cloak.
        if (c.sprite.id === 'ghostfreak' && c.cloakPhase) {
          c.roarTimer = rand(1.2, 2.5);
          c.bearPose = 'idle';
          return;
        }
        // Mew from south idle: ~70% bubble cycle, ~30% sink cycle.
        if (c.sprite.id === 'mew') {
          if (c.mewPhase !== 'normal') {
            c.roarTimer = rand(2, 4);
            c.bearPose = 'idle';
            return;
          }
          if ((c.bearFacing ?? 'south') !== 'south') {
            c.bearFacing = 'south';
            c.bearPose = 'idle';
            c.roarTimer = rand(0.9, 1.8);
            c.timer = Math.max(c.timer, 1.2);
            return;
          }
          c.bearPose = 'idle';
          const doSink = Math.random() < 0.3;
          const pose: BearPose = doSink ? 'kick' : 'roar';
          const frames = c.bearFrames?.get(`${pose}:south`);
          if (!frames || frames.length < 2) {
            c.roarTimer = rand(1.5, 3);
            return;
          }
          if (!doSink) c.mewPhase = 'to-bubble';
          c.bearPose = pose;
          c.bearFacing = 'south';
          c.flourishFacing = 'south';
          c.frame = 0;
          c.frameClock = 0;
          c.roarHold = frames.length * flourishPeriod(c) + 1;
          c.roarTimer = rand(5, 9);
          c.state = 'pause';
          // Stay paused for the whole oneshot — floor wander must not cancel it.
          c.timer = frames.length * flourishPeriod(c) + 2;
          return;
        }
        // Ragnok keeps current facing for 8-dir flame; others face south for clips.
        const useAura =
          (c.sprite.id === 'necromage' ||
            c.sprite.id === 'golem' ||
            c.sprite.id === 'victfur' ||
            c.sprite.id === 'ghostfreak') &&
          Math.random() < 0.4;
        const pose: BearPose = useAura ? 'aura' : 'roar';
        // Ragnok keeps facing for 8-dir flame; others face south for their clips.
        const facing: BearFacing =
          c.sprite.id === 'ragnok' && !useAura ? (c.bearFacing ?? 'south') : 'south';
        const frames =
          c.bearFrames?.get(`${pose}:${facing}`) ?? c.bearFrames?.get(`${pose}:south`);
        if (!frames || frames.length < 2) {
          c.roarTimer = rand(1.5, 3);
          c.bearPose = 'idle';
          return;
        }
        c.bearPose = pose;
        c.bearFacing = facing;
        c.flourishFacing = facing;
        // Flag only — oneshot in advanceFrame clears the hold.
        c.roarHold = frames.length * flourishPeriod(c) + 0.5;
        c.roarTimer = rand(10, 18);
        c.state = 'pause';
        c.timer = Math.max(c.timer, (c.roarHold ?? 0) + 0.35);
      } else if (isGoblin) {
        // Fight-idle → kick → fight-idle, or fight-idle → mask → walk.
        const doMask = Math.random() < 0.4;
        c.bearFacing = fightIdleFacing(c.bearFacing ?? 'south');
        if (doMask) {
          const hold = (c.bearFrames?.get('mask:south')?.length ?? 24) * GOBLIN_MASK_FRAME_TIME;
          c.bearPose = 'mask';
          c.bearFacing = 'south';
          c.roarHold = hold;
          c.roarTimer = rand(12, 20);
          c.timer = Math.max(c.timer, hold + 0.3);
        } else {
          const facing = fightIdleFacing(c.bearFacing ?? 'south');
          const hold =
            (c.bearFrames?.get(`kick:${facing}`)?.length ?? 7) * (c.sprite.frameTime || 0.12);
          c.bearPose = 'kick';
          c.bearFacing = facing;
          c.roarHold = hold;
          c.roarTimer = rand(12, 20);
          c.timer = Math.max(c.timer, hold + 0.3);
        }
      } else {
        const flourish = 1.8;
        c.roarTimer = rand(12, 20);
        c.roarHold = flourish;
        c.timer = Math.max(c.timer, flourish);
        c.bearPose = 'roar';
        c.bearFacing = roarGifFacing(c.bearFacing ?? 'south');
      }
      return;
    }
  }
  if (c.sprite.id === 'goblin-priest' && c.state === 'pause') {
    c.bearFacing = fightIdleFacing(c.bearFacing ?? 'south');
  }
  c.bearPose = 'idle';
}

function advanceFrame(c: Critter, dt: number): void {
  if (c.sprite.imageAtlas) {
    const prevPose = c.bearPose;
    const prevFacing = c.bearFacing;
    syncBearPose(c, dt);
    if (c.bearPose !== prevPose || c.bearFacing !== prevFacing) {
      // Don't reset one-shot sleep/wake frames when sync re-affirms the same pose.
      const sticky =
        (prevPose === 'sleep' && c.bearPose === 'sleep') ||
        (prevPose === 'wake' && c.bearPose === 'wake') ||
        (prevPose === 'launch' && c.bearPose === 'launch') ||
        (prevPose === 'kiss' && c.bearPose === 'kiss') ||
        (prevPose === 'aura' && c.bearPose === 'aura') ||
        (prevPose === 'kick' && c.bearPose === 'kick' && c.sprite.id === 'mew') ||
        (prevPose === 'roar' && c.bearPose === 'roar' && isFlourishWalker(c.sprite.id));
      if (!sticky) {
        c.frame = 0;
        c.frameClock = 0;
      }
    }
    // Wake GIF once → back to normal roaming (wait for frames if still loading).
    if (c.sleepPause && c.sleepPhase === 'wake') {
      const wakeFrames = wakeFrameList(c);
      if (!wakeFrames || wakeFrames.length < 2) {
        ensureBearPoseFrames(c, 'wake', sleepGifFacing(c.bearFacing ?? 'south'));
        c.bearPose = 'sleep-idle';
        c.frame = 0;
        return;
      }
      const count = wakeFrames.length;
      const period = c.sprite.frameTime || ALLIGATOR_BEAR_FRAME_TIME;
      c.frameClock += dt;
      if (c.frameClock < period) return;
      c.frameClock = 0;
      if (c.frame + 1 >= count) {
        c.sleepPause = false;
        c.sleepPhase = undefined;
        c.bearPose = 'idle';
        c.frame = 0;
        c.timer = rand(0.5, 1.4);
        return;
      }
      c.frame += 1;
      c.bearPose = 'wake';
      return;
    }
    const frames = bearFrameList(c);
    const count = frames?.length ?? 1;
    if (count <= 1) {
      // Flourish with no atlas → abort so they don't sit invisible.
      if (
        isFlourishWalker(c.sprite.id) &&
        (c.bearPose === 'roar' ||
          c.bearPose === 'aura' ||
          (c.sprite.id === 'mew' && c.bearPose === 'kick'))
      ) {
        c.roarHold = 0;
        c.bearPose = 'idle';
        c.flourishFacing = undefined;
        if (c.sprite.id === 'mew') c.mewPhase = 'normal';
        c.roarTimer = rand(4, 8);
      }
      c.frame = 0;
      return;
    }
    const period =
      c.sprite.id === 'void-walker' && c.bearPose === 'roar'
        ? VOID_ATTACK_FRAME_TIME
        : isFlourishWalker(c.sprite.id) &&
            (c.bearPose === 'roar' ||
              c.bearPose === 'aura' ||
              (c.sprite.id === 'mew' && c.bearPose === 'kick'))
          ? flourishPeriod(c)
          : c.sprite.id === 'mew' &&
              (c.mewPhase === 'bubble' || c.mewPhase === 'pre-pop') &&
              (c.bearPose === 'walk' || c.bearPose === 'idle')
            ? MEW_WALK_FRAME_TIME
          : c.sprite.id === 'goblin-priest' && c.bearPose === 'mask'
            ? GOBLIN_MASK_FRAME_TIME
            : c.sprite.frameTime || ALLIGATOR_BEAR_FRAME_TIME;
    c.frameClock += dt;
    if (c.frameClock < period) return;
    // Keep remainder so wall-clock stays aligned with frame time (zeroing used
    // to make each step ~dt-quantized and let timed flourishes finish early).
    c.frameClock -= period;
    // Lie-down GIF once → sleep still for 15s.
    if (c.sleepPause && c.bearPose === 'sleep') {
      if (c.frame + 1 >= count) {
        c.sleepPhase = 'hold';
        c.bearPose = 'sleep-idle';
        c.frame = 0;
        c.timer = ALLIGATOR_BEAR_SLEEP_HOLD;
        return;
      }
      c.frame += 1;
      return;
    }
    // Flourish walkers: play once through, then clear the hold (don't wrap mid-burst).
    // Outer block already spent one `period` from frameClock — advance that frame first,
    // then catch up extras if a hitch stacked more than one period.
    if (
      isFlourishWalker(c.sprite.id) &&
      (c.bearPose === 'roar' ||
        c.bearPose === 'aura' ||
        (c.sprite.id === 'mew' && c.bearPose === 'kick'))
    ) {
      let stepsLeft = 1;
      while (c.frameClock >= period && stepsLeft < 4) {
        c.frameClock -= period;
        stepsLeft += 1;
      }
      for (let i = 0; i < stepsLeft; i++) {
        if (c.frame + 1 >= count) {
          const finished = c.bearPose;
          c.roarHold = 0;
          c.flourishFacing = undefined;
          c.frame = 0;
          c.frameClock = 0;
          if (c.sprite.id === 'mew' && finished === 'roar') {
            // mew_to_bubble finished → roll in moving_bubble for a good while.
            c.mewPhase = 'bubble';
            c.mewBubbleTimer = rand(9, 14);
            c.roarHold = 0;
            c.flourishFacing = undefined;
            c.bearPose = 'walk';
            c.state = 'walk';
            c.timer = rand(3, 5.5);
            // Don't let idle flourish logic interrupt the bubble cycle.
            c.roarTimer = rand(16, 22);
            return;
          }
          if (c.sprite.id === 'mew' && finished === 'aura') {
            // Bubble pop finished → hold south idle so the exit reads clearly.
            c.mewPhase = 'normal';
            c.mewBubbleTimer = 0;
            c.mewSouthBurstCheck = 0;
            c.roarHold = 0;
            c.flourishFacing = undefined;
            c.bearFacing = 'south';
            c.bearPose = 'idle';
            c.state = 'pause';
            c.roarTimer = rand(4, 7);
            c.timer = rand(2.2, 3.4);
            return;
          }
          if (c.sprite.id === 'mew' && finished === 'kick') {
            // Sink finished → normal idle.
            c.mewPhase = 'normal';
            c.bearPose = 'idle';
            c.roarTimer = rand(3, 5.5);
            c.timer = Math.max(c.timer, rand(0.6, 1.2));
            return;
          }
          c.bearPose = 'idle';
          c.roarTimer = rand(8, 14);
          c.timer = Math.max(c.timer, rand(1.2, 2.4));
          return;
        }
        c.frame += 1;
      }
      return;
    }
    c.frame = (c.frame + 1) % count;
    return;
  }
  const resting = c.state === 'perch' || c.state === 'pause';
  const period = resting ? c.sprite.frameTime * (c.sprite.kind === 'flyer' ? 5 : 1e9) : c.sprite.frameTime;
  c.frameClock += dt;
  if (c.frameClock >= period) {
    c.frameClock = 0;
    c.frame = (c.frame + 1) % c.sprite.frames.length;
  }
  if (resting && c.sprite.kind !== 'flyer') c.frame = 0;
}

function drawCritter(ctx: CanvasRenderingContext2D, c: Critter): void {
  const x = Math.round(c.x);
  const y = Math.round(c.y);
  const cloakAlpha = c.sprite.id === 'ghostfreak' ? (c.cloakAlpha ?? 1) : 1;
  if (cloakAlpha <= 0.02) return;
  const prevAlpha = ctx.globalAlpha;
  if (cloakAlpha < 0.999) ctx.globalAlpha = prevAlpha * cloakAlpha;
  if (c.sprite.glow) {
    const cx = x + c.w / 2;
    const cy = y + c.h / 2;
    const r = Math.max(c.w, c.h) * 0.9;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, c.sprite.glow);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  if (c.sprite.imageAtlas && c.bearFrames) {
    let frames = bearFrameList(c);
    // Never leave atlas critters undrawn (missing roar used to blank Ragnok entirely).
    if (!frames?.length) {
      const face = c.bearFacing ?? 'south';
      frames =
        c.bearFrames.get(`idle:${face}`) ??
        c.bearFrames.get('idle:south') ??
        c.bearFrames.get(`walk:${face}`) ??
        c.bearFrames.get('walk:south');
    }
    const safeFrame =
      frames && frames.length ? Math.min(Math.max(0, c.frame | 0), frames.length - 1) : 0;
    const img = frames?.[safeFrame] ?? frames?.[0];
    if (img) {
      ctx.imageSmoothingEnabled = false;
      if (c.bearPose === 'sleep-idle') {
        // Fit the wider lie-down frame in the companion box; keep aspect, feet on the ledge.
        const maxW = c.w * SLEEP_IDLE_DRAW_SCALE;
        const maxH = c.h * SLEEP_IDLE_DRAW_SCALE;
        const aspect = img.width / Math.max(1, img.height);
        let dw = maxW;
        let dh = dw / aspect;
        if (dh > maxH) {
          dh = maxH;
          dw = dh * aspect;
        }
        dw = Math.max(1, Math.round(dw));
        dh = Math.max(1, Math.round(dh));
        const dx = x + Math.floor((c.w - dw) / 2);
        const dy = y + (c.h - dh);
        ctx.drawImage(img, dx, dy, dw, dh);
      } else if (c.sprite.id === 'void-walker' && c.bearPose === 'roar') {
        const dw = Math.max(1, Math.round(c.w * VOID_ATTACK_DRAW_SCALE));
        const dh = Math.max(1, Math.round(c.h * VOID_ATTACK_DRAW_SCALE));
        const dx = x + Math.floor((c.w - dw) / 2);
        const dy = y + (c.h - dh);
        ctx.drawImage(img, dx, dy, dw, dh);
      } else if (c.sprite.id === 'golem' && c.bearPose === 'idle') {
        const dw = Math.max(1, Math.round(c.w * GOLEM_IDLE_DRAW_SCALE));
        const dh = Math.max(1, Math.round(c.h * GOLEM_IDLE_DRAW_SCALE));
        const dx = x + Math.floor((c.w - dw) / 2);
        const dy = y + (c.h - dh);
        ctx.drawImage(img, dx, dy, dw, dh);
      } else if (c.sprite.id === 'golem' && c.bearPose === 'walk') {
        const dw = Math.max(1, Math.round(c.w * GOLEM_WALK_DRAW_SCALE));
        const dh = Math.max(1, Math.round(c.h * GOLEM_WALK_DRAW_SCALE));
        const dx = x + Math.floor((c.w - dw) / 2);
        const dy = y + (c.h - dh);
        ctx.drawImage(img, dx, dy, dw, dh);
      } else if (c.sprite.id === 'golem' && c.bearPose === 'roar') {
        const dw = Math.max(1, Math.round(c.w * GOLEM_CHANNEL_DRAW_SCALE));
        const dh = Math.max(1, Math.round(c.h * GOLEM_CHANNEL_DRAW_SCALE));
        const dx = x + Math.floor((c.w - dw) / 2);
        const dy = y + (c.h - dh);
        ctx.drawImage(img, dx, dy, dw, dh);
      } else if (c.sprite.id === 'golem' && c.bearPose === 'aura') {
        const dw = Math.max(1, Math.round(c.w * GOLEM_LIFT_DRAW_SCALE));
        const dh = Math.max(1, Math.round(c.h * GOLEM_LIFT_DRAW_SCALE));
        const dx = x + Math.floor((c.w - dw) / 2);
        const dy = y + (c.h - dh);
        ctx.drawImage(img, dx, dy, dw, dh);
      } else if (c.sprite.id === 'victfur' && c.bearPose === 'aura') {
        const dw = Math.max(1, Math.round(c.w * VICTFUR_HAT_DRAW_SCALE));
        const dh = Math.max(1, Math.round(c.h * VICTFUR_HAT_DRAW_SCALE));
        const dx = x + Math.floor((c.w - dw) / 2);
        const dy = y + (c.h - dh);
        ctx.drawImage(img, dx, dy, dw, dh);
      } else if (
        c.sprite.id === 'mew' &&
        (c.mewPhase === 'normal' || !c.mewPhase) &&
        (c.bearPose === 'idle' || c.bearPose === 'walk')
      ) {
        const dw = Math.max(1, Math.round(c.w * MEW_IDLE_WALK_DRAW_SCALE));
        const dh = Math.max(1, Math.round(c.h * MEW_IDLE_WALK_DRAW_SCALE));
        const dx = x + Math.floor((c.w - dw) / 2);
        const dy = y + (c.h - dh);
        ctx.drawImage(img, dx, dy, dw, dh);
      } else if (
        c.sprite.id === 'mew' &&
        (c.bearPose === 'roar' ||
          c.bearPose === 'aura' ||
          c.bearPose === 'kick' ||
          c.mewPhase === 'to-bubble' ||
          c.mewPhase === 'pop' ||
          c.mewPhase === 'bubble' ||
          c.mewPhase === 'pre-pop')
      ) {
        // Keep native aspect so to-bubble / sink / pop / bubble-walk aren't
        // stretched into a frozen-looking square.
        const maxW = c.w;
        const maxH = c.h;
        const aspect = img.width / Math.max(1, img.height);
        let dw = maxW;
        let dh = dw / aspect;
        if (dh > maxH) {
          dh = maxH;
          dw = dh * aspect;
        }
        dw = Math.max(1, Math.round(dw));
        dh = Math.max(1, Math.round(dh));
        const dx = x + Math.floor((c.w - dw) / 2);
        const dy = y + (c.h - dh);
        ctx.drawImage(img, dx, dy, dw, dh);
      } else {
        ctx.drawImage(img, x, y, c.w, c.h);
      }
    }
    ctx.globalAlpha = prevAlpha;
    return;
  }
  const frames = c.frames[c.facing === 1 ? 0 : 1];
  const img = frames[c.frame] ?? frames[0];
  if (img) ctx.drawImage(img, x, y);
  ctx.globalAlpha = prevAlpha;
}

/**
 * Pixel-art companions that roam the window: fae perch on headings and circle them, goblins walk
 * the tops of cards and hop between them, dragons circle high and breathe the odd ember.
 * Purely decorative; disabled by Settings → Animations off or Companions → None.
 */
export default function PixelCritters() {
  const [motion, setMotion] = useState<MotionPref>(() => getStoredMotion());
  const [genre, setGenre] = useState<CritterGenre>(() => getStoredCritters());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const onMotion = (e: Event) => {
      const d = (e as CustomEvent<MotionPref>).detail;
      if (d === 'on' || d === 'off') setMotion(d);
    };
    const onCritters = (e: Event) => {
      const d = (e as CustomEvent<CritterGenre>).detail;
      if (typeof d === 'string') setGenre(d);
    };
    window.addEventListener(MOTION_EVENT, onMotion);
    window.addEventListener(CRITTERS_EVENT, onCritters);
    return () => {
      window.removeEventListener(MOTION_EVENT, onMotion);
      window.removeEventListener(CRITTERS_EVENT, onCritters);
    };
  }, []);

  const active = motion === 'on' && genre !== 'off';

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let disposed = false;
    let raf = 0;
    let last: number | null = null;
    let perches: Perch[] = [];
    let perchClock = 0;
    let perchesDirty = true;
    const particles: Particle[] = [];
    let critters: Critter[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      perchesDirty = true;
    };

    const markDirty = () => {
      perchesDirty = true;
    };
    const onVisibility = () => {
      last = null;
    };

    const tick = (now: number) => {
      if (disposed) return;
      raf = window.requestAnimationFrame(tick);
      if (document.hidden) {
        last = null;
        return;
      }
      if (last === null) {
        last = now;
        return;
      }
      const dt = Math.min(MAX_DT, (now - last) / 1000);
      last = now;

      perchClock += dt;
      if (perchesDirty || perchClock >= PERCH_REFRESH_SECONDS) {
        perches = collectPerches();
        perchClock = 0;
        perchesDirty = false;
      }

      for (const c of critters) {
        if (c.sprite.kind === 'flyer') updateFlyer(c, dt, perches, particles);
        else updateGround(c, dt, perches);
        updateGhostfreakCloak(c, dt);
        advanceFrame(c, dt);
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]!;
        p.life += dt;
        if (p.life >= p.max) {
          particles.splice(i, 1);
          continue;
        }
        p.vy += p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const p of particles) {
        ctx.globalAlpha = Math.max(0, 1 - p.life / p.max);
        ctx.fillStyle = p.color;
        const s = Math.round(p.size);
        ctx.fillRect(Math.round(p.x / s) * s, Math.round(p.y / s) * s, s, s);
      }
      ctx.globalAlpha = 1;
      for (const c of critters) drawCritter(ctx, c);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', markDirty, { capture: true, passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    void (async () => {
      const cast = pickCast(genre);
      const atlasById = new Map<CritterId, Map<string, HTMLCanvasElement[]>>();
      await Promise.all(
        cast.map(async (id) => {
          if (id === 'alligator-bear') atlasById.set(id, await preloadAlligatorBear());
          else if (id === 'crabacus') atlasById.set(id, await preloadCrabacus());
          else if (id === 'emerald-wyvern') atlasById.set(id, await preloadEmeraldWyvern());
          else if (id === 'void-walker') atlasById.set(id, await preloadVoidWalker());
          else if (id === 'goblin-priest') atlasById.set(id, await preloadGoblinPriest());
          else if (id === 'fae-princess') atlasById.set(id, await preloadFaePrincess());
          else if (id === 'ragnok') atlasById.set(id, await preloadRagnok());
          else if (id === 'necromage') atlasById.set(id, await preloadNecromage());
          else if (id === 'golem') atlasById.set(id, await preloadGolem());
          else if (id === 'victfur') atlasById.set(id, await preloadVictfur());
          else if (id === 'iron-giant') atlasById.set(id, await preloadIronGiant());
          else if (id === 'ghostfreak') atlasById.set(id, await preloadGhostfreak());
          else if (id === 'mew') atlasById.set(id, await preloadMew());
        }),
      );
      if (disposed) return;
      critters = cast
        .map((id) => makeCritter(id, atlasById.get(id)))
        .filter((c): c is Critter => c !== null);
      raf = window.requestAnimationFrame(tick);
    })();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', markDirty, { capture: true });
      document.removeEventListener('visibilitychange', onVisibility);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [active, genre, atlasRev]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="wz-critters pointer-events-none fixed inset-0 z-[5] bg-transparent"
      aria-hidden
    />
  );
}
