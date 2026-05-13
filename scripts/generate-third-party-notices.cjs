/**
 * Reads package-lock.json and writes src/data/thirdPartyNotices.json
 * for the About page. Run via: npm run gen:notices (also runs before build).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const lockPath = path.join(root, 'package-lock.json');
const outPath = path.join(root, 'src', 'data', 'thirdPartyNotices.json');

const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
const packages = lock.packages || {};
const seen = new Map();

function packageNameFromPath(pkgPath) {
  if (!pkgPath.startsWith('node_modules')) return null;
  const rest = pkgPath.slice('node_modules'.length + 1);
  const parts = rest.split(/[/\\]node_modules[/\\]/);
  return parts[parts.length - 1].replace(/\\/g, '/') || null;
}

function normalizeLicense(info) {
  if (typeof info.license === 'string') return info.license;
  if (Array.isArray(info.licenses)) {
    return info.licenses
      .map((l) => (typeof l === 'string' ? l : l.type || l))
      .filter(Boolean)
      .join(', ');
  }
  if (info.licenses && typeof info.licenses === 'object') {
    return info.licenses.type || 'Unknown';
  }
  return 'Unknown';
}

for (const [pkgPath, info] of Object.entries(packages)) {
  if (pkgPath === '') continue;
  const name = packageNameFromPath(pkgPath.replace(/\\/g, '/'));
  if (!name) continue;

  const version = info.version;
  if (!version) continue;

  const dev = info.dev === true;
  const license = normalizeLicense(info);
  const key = `${name}@${version}`;
  if (seen.has(key)) continue;

  seen.set(key, {
    name,
    version,
    license,
    dev,
  });
}

const all = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
const runtime = all.filter((p) => !p.dev);
const development = all.filter((p) => p.dev);

const rootPkg = packages[''] || {};
const directProdNames = Object.keys(rootPkg.dependencies || {});
const directDevNames = Object.keys(rootPkg.devDependencies || {});

function pickDirect(name, wantDev) {
  const candidates = all.filter((p) => p.name === name && p.dev === wantDev);
  if (candidates.length) return candidates[0];
  const any = all.filter((p) => p.name === name);
  return any[0];
}

const directRuntime = directProdNames
  .map((n) => pickDirect(n, false))
  .filter(Boolean)
  .sort((a, b) => a.name.localeCompare(b.name));
const directDevelopment = directDevNames
  .map((n) => pickDirect(n, true))
  .filter(Boolean)
  .sort((a, b) => a.name.localeCompare(b.name));

const output = {
  generatedAt: new Date().toISOString(),
  /** Top-level dependencies from package.json (best for quick attribution). */
  directRuntime,
  directDevelopment,
  /** Full npm resolution tree from the lockfile (runtime / dev). */
  runtime,
  development,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

console.log(
  `third-party notices: ${directRuntime.length} direct runtime, ${directDevelopment.length} direct dev; ${runtime.length} transitive runtime, ${development.length} transitive dev-only. -> ${path.relative(root, outPath)}`,
);
