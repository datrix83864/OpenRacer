// scripts/rebuild-native.js
// Rebuilds native modules for the current Electron version.
// Runs as postinstall — failures are non-fatal so `npm install` always succeeds.
// If serialport doesn't load, run `npm run rebuild` manually after fixing the
// build environment (see README for Python / node-gyp setup).

const { execSync } = require('child_process');
const path = require('path');

// @electron/rebuild installs as 'electron-rebuild' in .bin (same CLI name)
const rebuildBin = path.join(__dirname, '..', 'node_modules', '.bin', 'electron-rebuild');

try {
  execSync(`"${rebuildBin}" -f -w serialport`, { stdio: 'inherit' });
  console.log('\n✓ Native modules rebuilt for Electron.\n');
} catch (_err) {
  console.warn(`
⚠  Native module rebuild failed. Serial port hardware will not work until this is fixed.

To fix on Windows (Python 3.12+):
  pip install setuptools
  npm run rebuild

To fix on macOS/Linux:
  npm run rebuild

See https://github.com/nodejs/node-gyp#installation for full node-gyp setup guide.
`);
  // Exit 0 so npm install succeeds
  process.exit(0);
}
