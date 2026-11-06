const fs = require('node:fs');
const path = require('node:path');
const pngToIco = require('png-to-ico').default;

const ROOT = path.resolve(__dirname, '..');
/** Prefer the named Wurlding PNG in build/, then fall back to app-icon.png / repo root. */
const candidates = [
  path.join(ROOT, 'build', 'Wurlding Icon.png'),
  path.join(ROOT, 'build', 'app-icon.png'),
  path.join(ROOT, 'Wurlding Icon.png'),
];
const inPng = candidates.find((p) => fs.existsSync(p));
const outPng = path.join(ROOT, 'build', 'app-icon.png');
const outIco = path.join(ROOT, 'build', 'app-icon.ico');

if (!inPng) {
  console.error('Missing Wurlding icon PNG (expected build/Wurlding Icon.png or build/app-icon.png)');
  process.exit(1);
}

fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
if (path.resolve(inPng) !== path.resolve(outPng)) {
  fs.copyFileSync(inPng, outPng);
  console.log(`Synced PNG: ${inPng} -> ${outPng}`);
}

pngToIco(outPng)
  .then((buf) => {
    fs.writeFileSync(outIco, buf);
    console.log(`Wrote: ${outIco}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
