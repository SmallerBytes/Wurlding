/**
 * PixelLab.ai export → runtime companion atlas.
 * Input: extracted folder with metadata.json + state/animations/...
 * Output: {slug}/{walk|idle|roar}/{facing}/frame_NNN.png + manifest.json
 */

import fs from 'fs';
import path from 'path';

export const MAX_CUSTOM_CRITTERS = 12;
export const FACINGS = [
  'south',
  'south-east',
  'east',
  'north-east',
  'north',
  'north-west',
  'west',
  'south-west',
];

const FRAME_NAME_RE = /(?:^|[\\/_-])(?:frame_|Frame_|West_|East_|North_|South_)?0*(\d+)\.png$/i;
const LOOSE_FRAME_RE = /(\d+)\.png$/i;

export function sanitizeSlug(raw) {
  const base = String(raw || 'companion')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return base || 'companion';
}

export function isCustomCritterId(value) {
  return typeof value === 'string' && /^custom:[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export function customIdFromSlug(slug) {
  return `custom:${sanitizeSlug(slug)}`;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function rmrf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function listManifests(root) {
  if (!fs.existsSync(root)) return [];
  const out = [];
  for (const name of fs.readdirSync(root)) {
    const manifestPath = path.join(root, name, 'manifest.json');
    if (!fs.existsSync(manifestPath)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      if (raw && typeof raw === 'object' && raw.slug) out.push(raw);
    } catch {
      // skip broken packs
    }
  }
  return out.sort((a, b) => String(a.name || a.slug).localeCompare(String(b.name || b.slug)));
}

/**
 * @param {string} root CUSTOM_CRITTERS_DIR
 * @param {{ files: Array<{ relativePath: string, buffer: Buffer }>, displayName?: string, folderName?: string }} input
 */
export function importPixelLabPack(root, input) {
  ensureDir(root);
  const existing = listManifests(root);
  if (existing.length >= MAX_CUSTOM_CRITTERS) {
    throw new Error(`You can have at most ${MAX_CUSTOM_CRITTERS} custom companions.`);
  }

  const files = new Map();
  for (const f of input.files || []) {
    const rel = String(f.relativePath || '')
      .replace(/\\/g, '/')
      .replace(/^\/+/, '');
    if (!rel || rel.includes('..')) continue;
    if (!/\.png$/i.test(rel) && !/metadata\.json$/i.test(rel)) continue;
    files.set(rel, f.buffer);
  }
  if (files.size === 0) throw new Error('No PNG frames or metadata.json found in the upload.');

  // Strip a single common root folder if every path shares one (webkitdirectory).
  const stripped = stripCommonRoot(files);
  const meta = readMetadata(stripped);
  const anims = collectAnimations(stripped, meta);
  if (Object.keys(anims).length === 0) {
    throw new Error(
      'Could not find PixelLab animations. Upload the folder that contains metadata.json and Idle/animations/…',
    );
  }

  const mapped = mapPoses(anims);
  if (!mapped.walk && !mapped.idle) {
    throw new Error('Pack needs a walk or idle animation (Idle, moving, or Idle_Moving).');
  }
  if (!mapped.idle && mapped.walk) mapped.idle = mapped.walk;
  if (!mapped.walk && mapped.idle) mapped.walk = mapped.idle;

  const folderHint = input.folderName || meta?.folderHint || 'companion';
  let slug = sanitizeSlug(folderHint);
  // Avoid colliding with built-in public critter names used as folders.
  if (['mew', 'ghostfreak', 'goblin-priest', 'fae-princess'].includes(slug)) {
    slug = sanitizeSlug(`${slug}-custom`);
  }
  let unique = slug;
  let n = 2;
  while (fs.existsSync(path.join(root, unique))) {
    unique = sanitizeSlug(`${slug}-${n}`);
    n += 1;
  }
  slug = unique;

  const atlasSize =
    Number(meta?.size?.width) ||
    Number(meta?.size?.height) ||
    detectAtlasSize(stripped, mapped) ||
    48;

  const dest = path.join(root, slug);
  ensureDir(dest);

  const poses = {};
  for (const pose of ['walk', 'idle', 'roar']) {
    const src = mapped[pose];
    if (!src) continue;
    const written = writePose(dest, pose, src, stripped);
    if (written) poses[pose] = written;
  }

  if (!poses.walk || !poses.idle) {
    rmrf(dest);
    throw new Error('Failed to write walk/idle frames from the pack.');
  }

  const name =
    String(input.displayName || '').trim() ||
    titleCase(folderHint.replace(/[-_]+/g, ' ')) ||
    'Custom companion';

  const manifest = {
    id: customIdFromSlug(slug),
    slug,
    name,
    atlasSize,
    poses,
    createdAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(dest, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf-8');
  return manifest;
}

export function listCustomCritters(root) {
  return listManifests(root);
}

export function readCustomCritter(root, slug) {
  const safe = sanitizeSlug(slug);
  const manifestPath = path.join(root, safe, 'manifest.json');
  if (!fs.existsSync(manifestPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch {
    return null;
  }
}

export function deleteCustomCritter(root, slug) {
  const safe = sanitizeSlug(slug);
  const dest = path.join(root, safe);
  if (!dest.startsWith(root) || !fs.existsSync(dest)) return false;
  rmrf(dest);
  return true;
}

function stripCommonRoot(files) {
  const keys = [...files.keys()];
  if (keys.length === 0) return files;
  const first = keys[0].split('/');
  if (first.length < 2) return files;
  const root = first[0];
  if (!keys.every((k) => k === root || k.startsWith(`${root}/`))) return files;
  // Only strip if it looks like a pack root (has metadata or Idle/ under it).
  const hasMeta = keys.some((k) => k === `${root}/metadata.json`);
  const hasIdle = keys.some((k) => k.startsWith(`${root}/Idle/`) || k.includes('/animations/'));
  if (!hasMeta && !hasIdle) return files;
  const out = new Map();
  for (const [k, v] of files) {
    if (k === root) continue;
    const next = k.startsWith(`${root}/`) ? k.slice(root.length + 1) : k;
    out.set(next, v);
  }
  return out;
}

function readMetadata(files) {
  const buf = files.get('metadata.json');
  if (!buf) return null;
  try {
    const json = JSON.parse(buf.toString('utf-8'));
    const state0 = Array.isArray(json?.states) ? json.states[0] : null;
    return {
      raw: json,
      size: state0?.character?.size || null,
      folderHint: null,
      states: Array.isArray(json?.states) ? json.states : [],
    };
  } catch {
    return null;
  }
}

/**
 * Collect animation name → facing → relative png paths (sorted).
 */
function collectAnimations(files, meta) {
  /** @type {Record<string, Record<string, string[]>>} */
  const anims = {};

  if (meta?.states?.length) {
    for (const state of meta.states) {
      const animations = state?.frames?.animations;
      if (!animations || typeof animations !== 'object') continue;
      for (const [animName, byFacing] of Object.entries(animations)) {
        if (!byFacing || typeof byFacing !== 'object') continue;
        if (!anims[animName]) anims[animName] = {};
        for (const [facing, list] of Object.entries(byFacing)) {
          if (!FACINGS.includes(facing)) continue;
          if (!Array.isArray(list)) continue;
          const paths = list.filter((p) => typeof p === 'string' && files.has(p.replace(/\\/g, '/')));
          if (paths.length) anims[animName][facing] = paths.map((p) => p.replace(/\\/g, '/'));
        }
      }
    }
  }

  // Heuristic scan for Idle/animations/<name>/<facing>/frame_*.png
  for (const rel of files.keys()) {
    if (!/\.png$/i.test(rel)) continue;
    if (/\/rotations\//i.test(rel)) continue;
    const m = rel.match(/^(?:[^/]+\/)?animations\/([^/]+)\/([^/]+)\/[^/]+\.png$/i);
    if (!m) continue;
    const animName = m[1];
    const facing = m[2];
    if (!FACINGS.includes(facing)) continue;
    if (!anims[animName]) anims[animName] = {};
    if (!anims[animName][facing]) anims[animName][facing] = [];
    if (!anims[animName][facing].includes(rel)) anims[animName][facing].push(rel);
  }

  for (const byFacing of Object.values(anims)) {
    for (const facing of Object.keys(byFacing)) {
      byFacing[facing].sort(compareFramePaths);
    }
  }
  return anims;
}

function compareFramePaths(a, b) {
  return frameIndex(a) - frameIndex(b);
}

function frameIndex(rel) {
  const base = path.basename(rel);
  let m = base.match(FRAME_NAME_RE) || base.match(LOOSE_FRAME_RE);
  if (m) return Number.parseInt(m[1], 10);
  return 0;
}

function facingCount(byFacing) {
  if (!byFacing || typeof byFacing !== 'object') return 0;
  return FACINGS.filter((f) => Array.isArray(byFacing[f]) && byFacing[f].length > 0).length;
}

function looksLikeWalkName(l) {
  return (
    l === 'moving' ||
    l === 'walk' ||
    l.includes('idle_moving') ||
    (l.includes('moving') && !l.includes('bubble')) ||
    l.includes('walk') ||
    l.includes('step') ||
    l.includes('stride') ||
    l.includes('march') ||
    l.includes('run') ||
    l.includes('tread') ||
    l.includes('locomot')
  );
}

function looksLikeFlourishName(l) {
  return (
    l.includes('void') ||
    l.includes('stomach') ||
    l.includes('split') ||
    l.includes('sink') ||
    l.includes('float_down') ||
    l.includes('disappear') ||
    l.includes('punch') ||
    l.includes('attack') ||
    l.includes('summon') ||
    l.includes('slash') ||
    l.includes('roar') ||
    l.includes('flame') ||
    l.includes('burst')
  );
}

function mapPoses(anims) {
  const names = Object.keys(anims);
  const lower = (s) => s.toLowerCase();
  const pick = (pred) => names.find((n) => pred(n, lower(n)));

  const idleName =
    pick((n, l) => n === 'Idle' || l === 'idle') ||
    pick((n, l) => l === 'idle_moving' || l.includes('idle_moving'));

  // Prefer explicit locomotion names, then any other wide (6+ dir) clip that isn't Idle.
  let walkName =
    pick((n, l) => looksLikeWalkName(l) && n !== idleName) ||
    pick(
      (n, l) =>
        n !== idleName &&
        !looksLikeFlourishName(l) &&
        facingCount(anims[n]) >= 6,
    );

  // Idle_Moving packs: same clip often serves as both walk and idle.
  if (!walkName && idleName && lower(idleName).includes('moving')) {
    walkName = idleName;
  }

  const used = new Set([idleName, walkName].filter(Boolean));
  const roarName =
    pick((n, l) => !used.has(n) && looksLikeFlourishName(l)) ||
    // Prefer shorter facing sets (south-only / 3-dir oneshots) over leftover locomotion.
    names
      .filter((n) => !used.has(n))
      .sort((a, b) => facingCount(anims[a]) - facingCount(anims[b]) || a.localeCompare(b))[0] ||
    null;

  return {
    idle: idleName ? anims[idleName] : walkName ? anims[walkName] : null,
    walk: walkName ? anims[walkName] : idleName ? anims[idleName] : null,
    roar: roarName ? anims[roarName] : null,
  };
}

function writePose(dest, pose, byFacing, files) {
  const facings = FACINGS.filter((f) => Array.isArray(byFacing[f]) && byFacing[f].length > 0);
  if (facings.length === 0) {
    // South-only flourish: accept any facing that has frames, prefer south.
    const available = Object.keys(byFacing).filter((f) => byFacing[f]?.length);
    if (!available.length) return null;
    const prefer = available.includes('south') ? ['south'] : [available[0]];
    return writePoseFacings(dest, pose, byFacing, files, prefer);
  }
  return writePoseFacings(dest, pose, byFacing, files, facings);
}

function writePoseFacings(dest, pose, byFacing, files, facings) {
  let maxCount = 0;
  for (const facing of facings) {
    const list = byFacing[facing] || [];
    const dir = path.join(dest, pose, facing);
    ensureDir(dir);
    let i = 0;
    for (const rel of list) {
      const buf = files.get(rel);
      if (!buf) continue;
      const outName = `frame_${String(i).padStart(3, '0')}.png`;
      fs.writeFileSync(path.join(dir, outName), buf);
      i += 1;
    }
    maxCount = Math.max(maxCount, i);
  }
  if (maxCount === 0) return null;
  return { frameCount: maxCount, facings };
}

function detectAtlasSize(files, mapped) {
  // Peek first south walk/idle frame — size unknown without image decode; use metadata only.
  void files;
  void mapped;
  return null;
}

function titleCase(s) {
  return String(s)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
