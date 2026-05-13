const fs = require('node:fs');
const path = require('node:path');
const pngToIco = require('png-to-ico').default;

const ROOT = path.resolve(__dirname, '..');
const inPng = path.join(ROOT, 'build', 'app-icon.png');
const outIco = path.join(ROOT, 'build', 'app-icon.ico');

if (!fs.existsSync(inPng)) {
  console.error(`Missing input PNG: ${inPng}`);
  process.exit(1);
}

pngToIco(inPng)
  .then((buf) => {
    fs.writeFileSync(outIco, buf);
    console.log(`Wrote: ${outIco}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

