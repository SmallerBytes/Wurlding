/**
 * User-uploaded PixelLab companions stored under the data server.
 * Frames: /api/custom-critter-files/{slug}/{walk|idle|roar}/{facing}/frame_NNN.png
 */

import { API_BASE } from '../api';
import { facingFromDelta, type BearFacing } from './alligatorBear';
import type { CritterGenreInfo, CritterId, CritterSprite } from './pixelCritters';

export type CustomCritterId = `custom:${string}`;

export type CustomPoseInfo = {
  frameCount: number;
  facings: string[];
};

export type CustomCritterManifest = {
  id: CustomCritterId;
  slug: string;
  name: string;
  atlasSize: number;
  poses: {
    walk?: CustomPoseInfo;
    idle?: CustomPoseInfo;
    roar?: CustomPoseInfo;
  };
  createdAt?: string;
};

export const CUSTOM_CRITTER_FACINGS: BearFacing[] = [
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

export const CUSTOM_CRITTER_FRAME_TIME = 0.1;
export const CUSTOM_CRITTER_FLOURISH_FRAME_TIME = 0.09;
export const CUSTOM_CRITTER_SCALE = 2;

const CUSTOM_ID_RE = /^custom:[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isCustomCritterId(value: unknown): value is CustomCritterId {
  return typeof value === 'string' && CUSTOM_ID_RE.test(value);
}

export function slugFromCustomId(id: CustomCritterId): string {
  return id.slice('custom:'.length);
}

let cache: CustomCritterManifest[] | null = null;
const listeners = new Set<() => void>();

export function getCachedCustomCritters(): CustomCritterManifest[] {
  return cache ?? [];
}

export function subscribeCustomCritters(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emitCustomCritters(): void {
  for (const listener of listeners) listener();
}

export async function fetchCustomCritters(force = false): Promise<CustomCritterManifest[]> {
  if (cache && !force) return cache;
  try {
    const res = await fetch(`${API_BASE}/api/custom-critters`);
    if (!res.ok) {
      cache = cache ?? [];
      return cache;
    }
    const json = (await res.json()) as { data?: CustomCritterManifest[] };
    cache = Array.isArray(json.data) ? json.data.filter((m) => isCustomCritterId(m.id)) : [];
  } catch {
    cache = cache ?? [];
  }
  emitCustomCritters();
  return cache;
}

export function customCritterGenre(manifest: CustomCritterManifest): CritterGenreInfo {
  return {
    id: manifest.id as unknown as CritterGenreInfo['id'],
    label: manifest.name,
    description: 'A companion you imported from a PixelLab export folder.',
    cast: [manifest.id as CritterId],
    count: 1,
  };
}

export function customCritterSprite(manifest: CustomCritterManifest): CritterSprite {
  return {
    id: manifest.id as CritterId,
    name: manifest.name,
    kind: 'walker',
    frames: [['.']],
    palette: {},
    scale: CUSTOM_CRITTER_SCALE,
    frameTime: CUSTOM_CRITTER_FRAME_TIME,
    speed: 55,
    imageAtlas: true,
    atlasSize: Math.max(16, Math.round(manifest.atlasSize || 48)),
    atlasExtras: Boolean(manifest.poses.roar),
  };
}

export function resolveCustomCritter(id: CritterId): CritterSprite | null {
  if (!isCustomCritterId(id)) return null;
  const manifest = getCachedCustomCritters().find((m) => m.id === id);
  return manifest ? customCritterSprite(manifest) : null;
}

export function resolveCustomManifest(id: CritterId): CustomCritterManifest | null {
  if (!isCustomCritterId(id)) return null;
  return getCachedCustomCritters().find((m) => m.id === id) ?? null;
}

export function customPreviewUrl(manifest: CustomCritterManifest): string | null {
  const idle = manifest.poses.idle;
  const walk = manifest.poses.walk;
  const pose = idle ? 'idle' : walk ? 'walk' : null;
  if (!pose) return null;
  const facings = (idle || walk)!.facings;
  const facing = facings.includes('south') ? 'south' : facings[0];
  if (!facing) return null;
  return `${API_BASE}/api/custom-critter-files/${manifest.slug}/${pose}/${facing}/frame_000.png`;
}

function frameUrl(slug: string, pose: string, facing: string, index: number): string {
  const n = String(index).padStart(3, '0');
  return `${API_BASE}/api/custom-critter-files/${slug}/${pose}/${facing}/frame_${n}.png`;
}

async function loadPng(url: string, size: number): Promise<HTMLCanvasElement | null> {
  if (typeof document === 'undefined') return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.src = objUrl;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || size;
      canvas.height = img.naturalHeight || size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0);
      return canvas;
    } finally {
      URL.revokeObjectURL(objUrl);
    }
  } catch {
    return null;
  }
}

async function loadSequence(
  slug: string,
  pose: string,
  facing: string,
  count: number,
  size: number,
): Promise<HTMLCanvasElement[]> {
  const loaded = await Promise.all(
    Array.from({ length: count }, (_, i) => loadPng(frameUrl(slug, pose, facing, i), size)),
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
    frames[i] = loaded[i] ?? (i > 0 ? frames[i - 1]! : fallback);
  }
  return frames;
}

export async function preloadCustomCritter(
  manifest: CustomCritterManifest,
): Promise<Map<string, HTMLCanvasElement[]>> {
  const map = new Map<string, HTMLCanvasElement[]>();
  const size = Math.max(16, Math.round(manifest.atlasSize || 48));
  const slug = manifest.slug;

  const walk = manifest.poses.walk;
  const idle = manifest.poses.idle;
  const roar = manifest.poses.roar;

  await Promise.all(
    CUSTOM_CRITTER_FACINGS.map(async (facing) => {
      if (walk && (walk.facings.includes(facing) || walk.facings.length === 0)) {
        const useFacing = walk.facings.includes(facing) ? facing : walk.facings[0]!;
        const frames = await loadSequence(slug, 'walk', useFacing, walk.frameCount, size);
        if (frames.length) map.set(`walk:${facing}`, frames);
      }
      if (idle && (idle.facings.includes(facing) || idle.facings.length === 0)) {
        const useFacing = idle.facings.includes(facing) ? facing : idle.facings[0]!;
        const frames = await loadSequence(slug, 'idle', useFacing, idle.frameCount, size);
        if (frames.length) map.set(`idle:${facing}`, frames);
      }
    }),
  );

  if (roar) {
    const facing = roar.facings.includes('south') ? 'south' : roar.facings[0] || 'south';
    const frames = await loadSequence(slug, 'roar', facing, roar.frameCount, size);
    if (frames.length) map.set('roar:south', frames);
  }

  return map;
}

export async function uploadCustomCritterFolder(opts: {
  files: FileList | File[];
  name?: string;
  folderName?: string;
}): Promise<CustomCritterManifest> {
  const list = Array.from(opts.files).filter(
    (f) => /\.png$/i.test(f.name) || /metadata\.json$/i.test(f.name),
  );
  if (!list.length) throw new Error('No PNG frames or metadata.json in that folder.');

  const form = new FormData();
  const paths: string[] = [];
  for (const file of list) {
    const rel =
      // webkitdirectory sets relative path on File
      (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
    paths.push(rel.replace(/\\/g, '/'));
    form.append('files', file, file.name);
  }
  form.append('paths', JSON.stringify(paths));
  if (opts.name?.trim()) form.append('name', opts.name.trim());
  if (opts.folderName?.trim()) form.append('folderName', opts.folderName.trim());

  const res = await fetch(`${API_BASE}/api/custom-critters`, { method: 'POST', body: form });
  const json = (await res.json()) as { ok?: boolean; data?: CustomCritterManifest; error?: string };
  if (!res.ok || !json.data) throw new Error(json.error || 'Import failed.');
  await fetchCustomCritters(true);
  return json.data;
}

export async function deleteCustomCritter(slug: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/custom-critters/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
  });
  const json = (await res.json()) as { ok?: boolean; error?: string };
  if (!res.ok) throw new Error(json.error || 'Delete failed.');
  await fetchCustomCritters(true);
}
