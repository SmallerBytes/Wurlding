import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import archiver from 'archiver';
import unzipper from 'unzipper';
import crypto from 'crypto';
import { nanoid } from 'nanoid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getDefaultAppDataRoot() {
  const platform = process.platform;
  if (platform === 'win32') {
    return (
      process.env.LOCALAPPDATA ||
      process.env.APPDATA ||
      path.join(process.env.USERPROFILE || __dirname, 'AppData', 'Local')
    );
  }
  if (platform === 'darwin') {
    return path.join(process.env.HOME || __dirname, 'Library', 'Application Support');
  }
  // linux + others
  return (
    process.env.XDG_DATA_HOME ||
    path.join(process.env.HOME || __dirname, '.local', 'share')
  );
}

const PROFILE = (process.env.WURLDING_PROFILE || 'dev').trim() || 'dev';
const DATA_DIR =
  (process.env.DATA_ROOT && process.env.DATA_ROOT.trim())
    ? process.env.DATA_ROOT.trim()
    : path.join(getDefaultAppDataRoot(), 'Wurlding', 'profiles', PROFILE);

const LEGACY_DATA_FILE = path.join(DATA_DIR, 'wurld-data.json');
const DATA_FILE = path.join(DATA_DIR, 'wurlding-data.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const IMAGES_DIR = path.join(DATA_DIR, 'images');
const PORT = Number.parseInt(process.env.PORT || '', 10) || 3001;
const MAX_BACKUPS = 50;
const EXPORT_FORMAT_VERSION = 1;
const IMPORT_TOKEN_TTL_MS = 15 * 60 * 1000;

/** @type {Map<string, { createdAt: number; payload: any; images: Map<string, Buffer> }>} */
const importSessions = new Map();

function ensureDirs() {
  for (const dir of [DATA_DIR, BACKUP_DIR, IMAGES_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

ensureDirs();

// One-time migration: keep old saves when renaming the app/file.
if (!fs.existsSync(DATA_FILE) && fs.existsSync(LEGACY_DATA_FILE)) {
  try {
    fs.copyFileSync(LEGACY_DATA_FILE, DATA_FILE);
    console.log('[WURLDING] Migrated data file to wurlding-data.json');
  } catch {
    console.error('[WURLDING] Failed to migrate legacy data file');
  }
}

function readData() {
  if (!fs.existsSync(DATA_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    console.error('[WURLDING] Failed to read data file, returning null');
    return null;
  }
}

function writeData(data) {
  const json = JSON.stringify(data, null, 2);
  fs.writeFileSync(DATA_FILE, json, 'utf-8');
}

function createBackup() {
  if (!fs.existsSync(DATA_FILE)) return;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_DIR, `wurlding-backup-${timestamp}.json`);
  fs.copyFileSync(DATA_FILE, backupFile);
  pruneOldBackups();
}

function pruneOldBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => (f.startsWith('wurlding-backup-') || f.startsWith('wurld-backup-')) && f.endsWith('.json'))
      .sort().reverse();
    for (const file of files.slice(MAX_BACKUPS)) {
      fs.unlinkSync(path.join(BACKUP_DIR, file));
    }
  } catch { /* ignore */ }
}

function listBackups() {
  try {
    return fs.readdirSync(BACKUP_DIR)
      .filter(f => (f.startsWith('wurlding-backup-') || f.startsWith('wurld-backup-')) && f.endsWith('.json'))
      .sort().reverse()
      .map(f => ({
        name: f,
        timestamp: f.replace('wurlding-backup-', '').replace('wurld-backup-', '').replace('.json', ''),
        size: fs.statSync(path.join(BACKUP_DIR, f)).size,
      }));
  } catch {
    return [];
  }
}

function cleanupImportSessions() {
  const now = Date.now();
  for (const [token, s] of importSessions) {
    if (now - s.createdAt > IMPORT_TOKEN_TTL_MS) importSessions.delete(token);
  }
}

function safeBaseName(name) {
  const n = String(name || '').trim() || 'world';
  return n
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'world';
}

function extractImageFilename(url) {
  if (!url || typeof url !== 'string') return null;
  const m = url.match(/\/api\/images\/([^/?#]+)/i);
  return m ? decodeURIComponent(m[1]) : null;
}

function localImageUrl(filename) {
  return `http://localhost:${PORT}/api/images/${encodeURIComponent(filename)}`;
}

function pickArray(obj, key) {
  const v = obj?.[key];
  return Array.isArray(v) ? v : [];
}

function buildWorldExport(data, worldId) {
  const worlds = pickArray(data, 'worlds');
  const world = worlds.find((w) => w && w.id === worldId);
  if (!world) return null;

  const stories = pickArray(data, 'stories').filter((x) => x?.worldId === worldId);
  const characters = pickArray(data, 'characters').filter((x) => x?.worldId === worldId);
  const locations = pickArray(data, 'locations').filter((x) => x?.worldId === worldId);
  const factions = pickArray(data, 'factions').filter((x) => x?.worldId === worldId);
  const items = pickArray(data, 'items').filter((x) => x?.worldId === worldId);
  const events = pickArray(data, 'events').filter((x) => x?.worldId === worldId);
  const connections = pickArray(data, 'connections').filter((x) => x?.worldId === worldId);
  const familyRelationships = pickArray(data, 'familyRelationships').filter((x) => x?.worldId === worldId);
  const familyTrees = pickArray(data, 'familyTrees').filter((x) => x?.worldId === worldId);
  const maps = pickArray(data, 'maps').filter((x) => x?.worldId === worldId);
  const fieldGuideEntries = pickArray(data, 'fieldGuideEntries').filter((x) => x?.worldId === worldId);

  const positions = data?.worldWebPositions?.[worldId] && typeof data.worldWebPositions[worldId] === 'object'
    ? data.worldWebPositions[worldId]
    : {};

  const referencedCreatureIds = new Set(
    fieldGuideEntries
      .map((e) => e?.creatureId)
      .filter((id) => typeof id === 'string' && id.trim()),
  );
  const customCreatures = pickArray(data, 'customCreatures').filter((c) => referencedCreatureIds.has(c?.id));

  const out = {
    worlds: [world],
    stories,
    characters,
    locations,
    factions,
    items,
    events,
    connections,
    familyRelationships,
    familyTrees,
    customCreatures,
    maps,
    fieldGuideEntries,
    worldWebPositions: { [worldId]: positions },
  };

  return { world, data: out };
}

function collectReferencedImageFilenames(exported) {
  const files = new Set();

  const addUrl = (u) => {
    const fn = extractImageFilename(u);
    if (fn) files.add(fn);
  };

  const world = exported.worlds?.[0];
  addUrl(world?.fieldGuideCoverImageUrl || '');

  for (const c of exported.characters || []) addUrl(c?.imageUrl || '');
  for (const l of exported.locations || []) addUrl(l?.imageUrl || '');
  for (const i of exported.items || []) addUrl(i?.imageUrl || '');
  for (const e of exported.fieldGuideEntries || []) addUrl(e?.imageUrl || '');

  return [...files];
}

function ensureUniqueImageFilename(original) {
  const ext = path.extname(original) || '.png';
  const base = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${base}${ext}`;
}

function remapRfId(rfId, maps) {
  if (!rfId || typeof rfId !== 'string') return rfId;
  const idx = rfId.indexOf(':');
  if (idx === -1) return rfId;
  const type = rfId.slice(0, idx);
  const id = rfId.slice(idx + 1);
  const m = maps[type];
  if (!m) return rfId;
  const next = m.get(id);
  if (!next) return rfId;
  return `${type}:${next}`;
}

function clone(obj) {
  return obj ? JSON.parse(JSON.stringify(obj)) : obj;
}

function buildIdMaps(payload, worldIdMap) {
  const mapFor = (arr) => {
    const m = new Map();
    for (const x of arr) {
      if (!x?.id) continue;
      m.set(x.id, nanoid());
    }
    return m;
  };

  return {
    world: worldIdMap,
    story: mapFor(payload.stories || []),
    character: mapFor(payload.characters || []),
    location: mapFor(payload.locations || []),
    faction: mapFor(payload.factions || []),
    item: mapFor(payload.items || []),
    event: mapFor(payload.events || []),
    connection: mapFor(payload.connections || []),
    familyRelationship: mapFor(payload.familyRelationships || []),
    familyTree: mapFor(payload.familyTrees || []),
    map: mapFor(payload.maps || []),
    fieldGuideEntry: mapFor(payload.fieldGuideEntries || []),
    creature: mapFor(payload.customCreatures || []),
  };
}

function applyImportTransform(payload, strategy) {
  const srcWorld = payload.worlds?.[0];
  if (!srcWorld?.id) throw new Error('Invalid payload: missing world');

  const worldIdMap = new Map();
  if (strategy.kind === 'createNew') {
    worldIdMap.set(srcWorld.id, nanoid());
  } else if (strategy.kind === 'mergeIntoExisting') {
    worldIdMap.set(srcWorld.id, strategy.targetWorldId);
  } else {
    throw new Error('Unknown import strategy');
  }

  const idMaps = buildIdMaps(payload, worldIdMap);

  const out = clone(payload);

  const remapId = (type, id) => (idMaps[type]?.get(id) ?? id);
  const remapWorldId = (id) => remapId('world', id);

  // Worlds
  if (strategy.kind === 'createNew') {
    out.worlds = out.worlds.map((w) => ({ ...w, id: remapWorldId(w.id) }));
  } else {
    // Merge: keep target world record untouched; caller will handle optional note append.
    out.worlds = [];
  }

  // Stories + chapters
  out.stories = (out.stories || []).map((s) => ({
    ...s,
    id: remapId('story', s.id),
    worldId: remapWorldId(s.worldId),
    chapters: Array.isArray(s.chapters)
      ? s.chapters.map((ch) => ({ ...ch, id: nanoid() }))
      : [],
  }));

  // Characters
  out.characters = (out.characters || []).map((c) => ({
    ...c,
    id: remapId('character', c.id),
    worldId: remapWorldId(c.worldId),
  }));

  // Locations
  out.locations = (out.locations || []).map((l) => ({
    ...l,
    id: remapId('location', l.id),
    worldId: remapWorldId(l.worldId),
  }));

  // Factions
  out.factions = (out.factions || []).map((f) => ({
    ...f,
    id: remapId('faction', f.id),
    worldId: remapWorldId(f.worldId),
  }));

  // Items
  out.items = (out.items || []).map((i) => ({
    ...i,
    id: remapId('item', i.id),
    worldId: remapWorldId(i.worldId),
  }));

  // Events
  out.events = (out.events || []).map((e) => ({
    ...e,
    id: remapId('event', e.id),
    worldId: remapWorldId(e.worldId),
  }));

  // Family trees + relationships
  out.familyTrees = (out.familyTrees || []).map((t) => ({
    ...t,
    id: remapId('familyTree', t.id),
    worldId: remapWorldId(t.worldId),
  }));

  out.familyRelationships = (out.familyRelationships || []).map((r) => ({
    ...r,
    id: remapId('familyRelationship', r.id),
    worldId: remapWorldId(r.worldId),
    treeId: remapId('familyTree', r.treeId),
    character1Id: remapId('character', r.character1Id),
    character2Id: remapId('character', r.character2Id),
  }));

  // Connections
  out.connections = (out.connections || []).map((c) => ({
    ...c,
    id: remapId('connection', c.id),
    worldId: remapWorldId(c.worldId),
    sourceId: remapId(c.sourceType, c.sourceId),
    targetId: remapId(c.targetType, c.targetId),
  }));

  // Maps (only remap map id + worldId; internal element ids/layer ids stay)
  out.maps = (out.maps || []).map((m) => ({
    ...m,
    id: remapId('map', m.id),
    worldId: remapWorldId(m.worldId),
    elements: Array.isArray(m.elements)
      ? m.elements.map((el) => ({
          ...el,
          locationId: el.locationId ? remapId('location', el.locationId) : el.locationId,
        }))
      : [],
  }));

  // Field guide entries
  out.fieldGuideEntries = (out.fieldGuideEntries || []).map((e) => ({
    ...e,
    id: remapId('fieldGuideEntry', e.id),
    worldId: remapWorldId(e.worldId),
    creatureId: e.creatureId ? remapId('creature', e.creatureId) : e.creatureId,
  }));

  // Custom creatures
  out.customCreatures = (out.customCreatures || []).map((c) => ({
    ...c,
    id: remapId('creature', c.id),
  }));

  // World web positions: remap rfId keys
  const newPositions = {};
  const srcPos = out.worldWebPositions?.[srcWorld.id] && typeof out.worldWebPositions[srcWorld.id] === 'object'
    ? out.worldWebPositions[srcWorld.id]
    : {};
  for (const [rfId, pos] of Object.entries(srcPos)) {
    newPositions[remapRfId(rfId, idMaps)] = pos;
  }
  out.worldWebPositions = { [remapWorldId(srcWorld.id)]: newPositions };

  return { transformed: out, worldIdMap, idMaps };
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, IMAGES_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.png';
      const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
      cb(null, name);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpe?g|png|gif|webp|svg|bmp|avif)$/i;
    if (allowed.test(file.originalname) || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

const wurldUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = file.originalname.toLowerCase().endsWith('.wurld')
      || file.mimetype === 'application/zip'
      || file.mimetype === 'application/octet-stream';
    if (ok) cb(null, true);
    else cb(new Error('Only .wurld files are allowed'));
  },
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use('/api/images', express.static(IMAGES_DIR));

app.get('/api/data', (_req, res) => {
  res.json({ ok: true, data: readData() });
});

app.post('/api/data', (req, res) => {
  try {
    createBackup();
    writeData(req.body);
    res.json({ ok: true });
  } catch (err) {
    console.error('[WURLDING] Save error:', err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

app.get('/api/backups', (_req, res) => {
  res.json({ ok: true, backups: listBackups() });
});

app.post('/api/restore/:filename', (req, res) => {
  const backupFile = path.join(BACKUP_DIR, req.params.filename);
  if (!fs.existsSync(backupFile)) {
    return res.status(404).json({ ok: false, error: 'Backup not found' });
  }
  try {
    createBackup();
    fs.copyFileSync(backupFile, DATA_FILE);
    res.json({ ok: true, data: readData() });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ ok: false, error: 'No file uploaded' });
  }
  const url = `http://localhost:${PORT}/api/images/${req.file.filename}`;
  console.log(`[WURLDING] Image saved: ${req.file.filename}`);
  res.json({ ok: true, url, filename: req.file.filename });
});

app.delete('/api/images/:filename', (req, res) => {
  const filePath = path.join(IMAGES_DIR, req.params.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`[WURLDING] Image deleted: ${req.params.filename}`);
  }
  res.json({ ok: true });
});

app.get('/api/export/world/:worldId', (req, res) => {
  const worldId = String(req.params.worldId || '').trim();
  if (!worldId) return res.status(400).json({ ok: false, error: 'Missing worldId' });

  const data = readData();
  if (!data) return res.status(404).json({ ok: false, error: 'No data found' });

  const built = buildWorldExport(data, worldId);
  if (!built) return res.status(404).json({ ok: false, error: 'World not found' });

  const exported = built.data;
  const filenames = collectReferencedImageFilenames(exported);

  const worldName = safeBaseName(built.world?.name || 'world');
  const downloadName = `${worldName}.wurld`;

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => {
    console.error('[WURLDING] Export error:', err);
    try { res.status(500).end(); } catch { /* */ }
  });
  archive.pipe(res);

  const manifest = {
    formatVersion: EXPORT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    appName: 'Wurlding',
    mode: 'singleWorld',
    worldId: built.world.id,
    worldName: built.world.name || '',
  };

  archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });
  archive.append(JSON.stringify(exported, null, 2), { name: 'data.json' });

  for (const fn of filenames) {
    const full = path.join(IMAGES_DIR, fn);
    if (fs.existsSync(full) && fs.statSync(full).isFile()) {
      archive.file(full, { name: `images/${fn}` });
    }
  }

  archive.finalize();
});

app.post('/api/import/world', wurldUpload.single('file'), async (req, res) => {
  cleanupImportSessions();
  if (!req.file?.buffer) return res.status(400).json({ ok: false, error: 'No file uploaded' });

  try {
    const zip = await unzipper.Open.buffer(req.file.buffer);
    const entryByName = new Map(zip.files.map((f) => [f.path, f]));
    const manifestEntry = entryByName.get('manifest.json');
    const dataEntry = entryByName.get('data.json');
    if (!manifestEntry || !dataEntry) {
      return res.status(400).json({ ok: false, error: 'Invalid .wurld file (missing manifest.json or data.json)' });
    }

    const manifest = JSON.parse((await manifestEntry.buffer()).toString('utf-8'));
    if (manifest.formatVersion !== EXPORT_FORMAT_VERSION) {
      return res.status(400).json({ ok: false, error: `Unsupported formatVersion ${manifest.formatVersion}` });
    }

    const payload = JSON.parse((await dataEntry.buffer()).toString('utf-8'));
    const world = Array.isArray(payload.worlds) ? payload.worlds[0] : null;
    if (!world?.id) return res.status(400).json({ ok: false, error: 'Invalid data.json (missing world)' });

    const referenced = collectReferencedImageFilenames(payload);
    const images = new Map();
    const missingImages = [];
    for (const fn of referenced) {
      const e = entryByName.get(`images/${fn}`);
      if (!e) {
        missingImages.push(fn);
        continue;
      }
      images.set(fn, await e.buffer());
    }

    const token = crypto.randomUUID();
    importSessions.set(token, { createdAt: Date.now(), payload, images });

    const counts = {
      stories: pickArray(payload, 'stories').length,
      characters: pickArray(payload, 'characters').length,
      locations: pickArray(payload, 'locations').length,
      factions: pickArray(payload, 'factions').length,
      items: pickArray(payload, 'items').length,
      events: pickArray(payload, 'events').length,
      connections: pickArray(payload, 'connections').length,
      familyTrees: pickArray(payload, 'familyTrees').length,
      familyRelationships: pickArray(payload, 'familyRelationships').length,
      maps: pickArray(payload, 'maps').length,
      fieldGuideEntries: pickArray(payload, 'fieldGuideEntries').length,
      customCreatures: pickArray(payload, 'customCreatures').length,
      images: referenced.length,
    };

    return res.json({
      ok: true,
      importToken: token,
      world: { id: world.id, name: world.name || '' },
      counts,
      missingImages,
    });
  } catch (err) {
    console.error('[WURLDING] Import preview error:', err);
    return res.status(400).json({ ok: false, error: 'Failed to read .wurld file' });
  }
});

app.post('/api/import/world/commit', async (req, res) => {
  cleanupImportSessions();
  const { importToken, strategy } = req.body || {};
  if (!importToken || typeof importToken !== 'string') return res.status(400).json({ ok: false, error: 'Missing importToken' });

  const session = importSessions.get(importToken);
  if (!session) return res.status(404).json({ ok: false, error: 'Import session expired' });

  try {
    const payload = session.payload;
    const srcWorld = Array.isArray(payload.worlds) ? payload.worlds[0] : null;
    if (!srcWorld?.id) throw new Error('Invalid payload world');

    let strat;
    if (strategy === 'createNew') {
      strat = { kind: 'createNew' };
    } else if (strategy && typeof strategy === 'object' && strategy.kind === 'mergeIntoExisting' && strategy.targetWorldId) {
      strat = { kind: 'mergeIntoExisting', targetWorldId: String(strategy.targetWorldId) };
    } else {
      return res.status(400).json({ ok: false, error: 'Invalid strategy' });
    }

    const existing = readData() || {
      worlds: [], stories: [], characters: [], locations: [], factions: [], items: [], events: [], connections: [],
      familyRelationships: [], familyTrees: [], customCreatures: [], maps: [], fieldGuideEntries: [], worldWebPositions: {}, activeWorldId: null,
    };

    const { transformed, worldIdMap } = applyImportTransform(payload, strat);

    // Copy images and rewrite image URLs in transformed payload.
    const imageMap = new Map(); // oldFilename -> newFilename
    for (const [oldFn, buf] of session.images.entries()) {
      let fn = oldFn;
      let outPath = path.join(IMAGES_DIR, fn);
      if (fs.existsSync(outPath)) {
        fn = ensureUniqueImageFilename(oldFn);
        outPath = path.join(IMAGES_DIR, fn);
      }
      fs.writeFileSync(outPath, buf);
      imageMap.set(oldFn, fn);
    }

    const rewriteImageUrl = (url) => {
      const oldFn = extractImageFilename(url);
      if (!oldFn) return url;
      const newFn = imageMap.get(oldFn);
      if (!newFn) return '';
      return localImageUrl(newFn);
    };

    const patchImages = (obj, key) => {
      if (!obj || typeof obj !== 'object') return;
      if (obj[key]) obj[key] = rewriteImageUrl(obj[key]);
    };

    for (const w of transformed.worlds || []) patchImages(w, 'fieldGuideCoverImageUrl');
    for (const c of transformed.characters || []) patchImages(c, 'imageUrl');
    for (const l of transformed.locations || []) patchImages(l, 'imageUrl');
    for (const i of transformed.items || []) patchImages(i, 'imageUrl');
    for (const e of transformed.fieldGuideEntries || []) patchImages(e, 'imageUrl');

    if (strat.kind === 'mergeIntoExisting') {
      const targetWorldId = strat.targetWorldId;
      const target = (existing.worlds || []).find((w) => w?.id === targetWorldId);
      if (!target) return res.status(404).json({ ok: false, error: 'Target world not found' });

      const importedNotes = [
        srcWorld.description,
        srcWorld.history,
        srcWorld.geography,
        srcWorld.cultures,
        srcWorld.religions,
        srcWorld.magicSystem,
        srcWorld.technology,
        srcWorld.notes,
      ].filter((t) => typeof t === 'string' && t.trim()).join('\n\n');

      if (importedNotes) {
        const header = `--- Imported from ${srcWorld.name || 'world'} on ${new Date().toISOString()} ---`;
        target.notes = `${(target.notes || '').trim()}\n\n${header}\n${importedNotes}`.trim();
        target.updatedAt = new Date().toISOString();
      }
    }

    // Merge into existing dataset
    const next = clone(existing);
    next.worlds = [...(next.worlds || []), ...(transformed.worlds || [])];
    next.stories = [...(next.stories || []), ...(transformed.stories || [])];
    next.characters = [...(next.characters || []), ...(transformed.characters || [])];
    next.locations = [...(next.locations || []), ...(transformed.locations || [])];
    next.factions = [...(next.factions || []), ...(transformed.factions || [])];
    next.items = [...(next.items || []), ...(transformed.items || [])];
    next.events = [...(next.events || []), ...(transformed.events || [])];
    next.connections = [...(next.connections || []), ...(transformed.connections || [])];
    next.familyTrees = [...(next.familyTrees || []), ...(transformed.familyTrees || [])];
    next.familyRelationships = [...(next.familyRelationships || []), ...(transformed.familyRelationships || [])];
    next.maps = [...(next.maps || []), ...(transformed.maps || [])];
    next.fieldGuideEntries = [...(next.fieldGuideEntries || []), ...(transformed.fieldGuideEntries || [])];
    next.customCreatures = [...(next.customCreatures || []), ...(transformed.customCreatures || [])];

    next.worldWebPositions = next.worldWebPositions || {};
    const [srcWorldId, destWorldId] = [...worldIdMap.entries()][0];
    const pos = transformed.worldWebPositions?.[destWorldId] ?? {};
    next.worldWebPositions[destWorldId] = {
      ...(next.worldWebPositions[destWorldId] || {}),
      ...pos,
    };

    createBackup();
    writeData(next);

    importSessions.delete(importToken);
    return res.json({ ok: true, worldId: destWorldId });
  } catch (err) {
    console.error('[WURLDING] Import commit error:', err);
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

app.listen(PORT, () => {
  console.log(`[WURLDING] Data server running on http://localhost:${PORT}`);
  console.log(`[WURLDING] Data file: ${DATA_FILE}`);
  console.log(`[WURLDING] Images:    ${IMAGES_DIR}`);
  console.log(`[WURLDING] Backups:   ${BACKUP_DIR}`);
  const data = readData();
  if (data) {
    const worldCount = data.worlds?.length ?? 0;
    console.log(`[WURLDING] Loaded ${worldCount} world(s) from disk`);
  } else {
    console.log(`[WURLDING] No existing data found — starting fresh`);
  }
});
