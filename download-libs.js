// download-libs.js
// Downloads external dependencies for offline use

const https = require('https');
const fs = require('fs');
const path = require('path');

const libraries = [
  {
    name: 'jsPDF',
    url: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    filename: 'jspdf.umd.min.js'
  },
  {
    name: 'jsPDF AutoTable Plugin',
    url: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js',
    filename: 'jspdf.plugin.autotable.min.js'
  }
];

const libDir = path.join(__dirname, 'lib');

// Create lib directory if it doesn't exist
if (!fs.existsSync(libDir)) {
  fs.mkdirSync(libDir, { recursive: true });
  console.log('✓ Created lib/ directory');
}

function downloadFile(url, filepath, name) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`✓ Downloaded ${name}`);
          resolve();
        });
      } else {
        fs.unlink(filepath, () => {});
        reject(new Error(`Failed to download ${name}: HTTP ${response.statusCode}`));
      }
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

async function downloadAllLibraries() {
  console.log('📦 Downloading libraries for offline use...\n');

  for (const lib of libraries) {
    const filepath = path.join(libDir, lib.filename);
    
    if (fs.existsSync(filepath)) {
      console.log(`⏭  Skipping ${lib.name} (already exists)`);
      continue;
    }

    try {
      await downloadFile(lib.url, filepath, lib.name);
    } catch (err) {
      console.error(`✗ Error downloading ${lib.name}:`, err.message);
      process.exit(1);
    }
  }

  console.log('\n✅ All libraries downloaded successfully!');
  console.log('📂 Libraries saved to: lib/');
  console.log('🚀 OpenRacer will now work offline!');
}

// Run the download
downloadAllLibraries().catch((err) => {
  console.error('Failed to download libraries:', err);
  process.exit(1);
});