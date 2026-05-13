const fs = require('fs');
const path = require('path');

function getDefaultAppDataRoot() {
  const platform = process.platform;
  if (platform === 'win32') {
    return (
      process.env.LOCALAPPDATA ||
      process.env.APPDATA ||
      path.join(process.env.USERPROFILE || process.cwd(), 'AppData', 'Local')
    );
  }
  if (platform === 'darwin') {
    return path.join(process.env.HOME || process.cwd(), 'Library', 'Application Support');
  }
  return process.env.XDG_DATA_HOME || path.join(process.env.HOME || process.cwd(), '.local', 'share');
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const projectRoot = path.join(__dirname, '..');
const legacyDir = path.join(projectRoot, 'data');
const candidates = [
  path.join(legacyDir, 'wurlding-data.json'),
  path.join(legacyDir, 'wurld-data.json'),
];

const src = candidates.find((p) => fs.existsSync(p));
if (!src) {
  console.error('[WURLDING] No legacy data file found in ./data');
  process.exit(1);
}

const destDir = path.join(getDefaultAppDataRoot(), 'Wurlding', 'profiles', 'dev');
ensureDir(destDir);

const dest = path.join(destDir, 'wurlding-data.json');
fs.copyFileSync(src, dest);
console.log('[WURLDING] Copied legacy data to:', dest);
console.log('[WURLDING] Source was:', src);

