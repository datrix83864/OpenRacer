// main.js - Electron main process

const RaceTiming = require('./modules/race-timing');
const RacerDatabase = require('./modules/racer-database');

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const https = require('https');

let mainWindow;
let updateInfo = null;
let raceTiming;
let racerDB;

// Configuration
const APP_VERSION = '1.0.0';
const UPDATE_CHECK_URL = 'https://api.github.com/repos/datrix83864/openracer/releases/latest';
const CONFIG_DIR = path.join(app.getPath('userData'), 'config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'app-config.json');

// Ensure config directory exists
async function ensureConfigDir() {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  } catch (err) {
    console.error('Error creating config directory:', err);
  }
}

// Load configuration
async function loadConfig() {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    // Return default config if file doesn't exist
    return {
      lastUpdateCheck: null,
      updatePreference: 'prompt', // 'prompt', 'background', 'manual'
      subscriptionExpiry: null, // ISO date string or null for free tier
      skipVersion: null
    };
  }
}

// Save configuration
async function saveConfig(config) {
  try {
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (err) {
    console.error('Error saving config:', err);
  }
}

// Check for internet connectivity
function checkInternetConnection() {
  return new Promise((resolve) => {
    const req = https.get('https://www.google.com', { timeout: 5000 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Check for updates from GitHub releases
async function checkForUpdates() {
  return new Promise((resolve, reject) => {
    https.get(UPDATE_CHECK_URL, {
      headers: { 'User-Agent': 'OpenRacer' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const release = JSON.parse(data);
          resolve({
            version: release.tag_name.replace('v', ''),
            downloadUrl: release.assets[0]?.browser_download_url,
            releaseNotes: release.body,
            publishedAt: release.published_at
          });
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

// Compare versions (simple semantic versioning)
function isNewerVersion(current, latest) {
  const currentParts = current.split('.').map(Number);
  const latestParts = latest.split('.').map(Number);
  
  for (let i = 0; i < 3; i++) {
    if (latestParts[i] > currentParts[i]) return true;
    if (latestParts[i] < currentParts[i]) return false;
  }
  return false;
}

// Check subscription status
function checkSubscription(config) {
  if (!config.subscriptionExpiry) {
    return { status: 'free', daysRemaining: null };
  }
  
  const expiry = new Date(config.subscriptionExpiry);
  const now = new Date();
  const daysRemaining = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  
  if (daysRemaining < 0) {
    return { status: 'expired', daysRemaining: 0 };
  } else if (daysRemaining <= 7) {
    return { status: 'expiring', daysRemaining };
  } else {
    return { status: 'active', daysRemaining };
  }
}

// Create the main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#1a1a1a',
    show: false, // Don't show until ready
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  mainWindow.loadFile('index.html');

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

// Handle IPC messages from renderer
ipcMain.handle('check-internet', async () => {
  return await checkInternetConnection();
});

ipcMain.handle('check-updates', async () => {
  try {
    const hasInternet = await checkInternetConnection();
    if (!hasInternet) {
      return { status: 'no-internet' };
    }

    const config = await loadConfig();
    
    // Check subscription
    const subscription = checkSubscription(config);
    
    // Check for updates
    const latestRelease = await checkForUpdates();
    
    if (isNewerVersion(APP_VERSION, latestRelease.version)) {
      // Don't prompt if user chose to skip this version
      if (config.skipVersion === latestRelease.version) {
        return { 
          status: 'skipped',
          subscription
        };
      }
      
      return {
        status: 'update-available',
        current: APP_VERSION,
        latest: latestRelease.version,
        downloadUrl: latestRelease.downloadUrl,
        releaseNotes: latestRelease.releaseNotes,
        subscription
      };
    }
    
    return { 
      status: 'up-to-date',
      current: APP_VERSION,
      subscription
    };
  } catch (err) {
    console.error('Update check failed:', err);
    return { status: 'error', error: err.message };
  }
});

ipcMain.handle('skip-version', async (event, version) => {
  const config = await loadConfig();
  config.skipVersion = version;
  await saveConfig(config);
  return { success: true };
});

ipcMain.handle('load-config', async () => {
  return await loadConfig();
});

ipcMain.handle('save-config', async (event, config) => {
  await saveConfig(config);
  return { success: true };
});

ipcMain.handle('open-update-dialog', async (event, updateInfo) => {
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Available',
    message: `OpenRacer ${updateInfo.latest} is available`,
    detail: `You are currently running version ${updateInfo.current}.\n\n` +
            `Release Notes:\n${updateInfo.releaseNotes?.substring(0, 200)}...`,
    buttons: ['Download Now', 'Download in Background', 'Skip This Version', 'Remind Me Later'],
    defaultId: 0,
    cancelId: 3
  });
  
  return result.response;
});

// App lifecycle
app.whenReady().then(async () => {
  await ensureConfigDir();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Initialize race timing module
  const timingDataDir = path.join(app.getPath('userData'), 'races');
  raceTiming = new RaceTiming({
    dataDir: timingDataDir,
    autoSave: true,
    precision: 3
  });
  
  // Initialize racer database module
  const racerDataDir = path.join(app.getPath('userData'), 'racers');
  racerDB = new RacerDatabase({
    dataDir: racerDataDir,
    mountainId: 'default-mountain', // TODO: Load from config
    autoSave: true,
    requireWaiver: false // TODO: Load from mountain settings
  });
  
  try {
    await raceTiming.initialize();
    await racerDB.initialize();
    console.log('Timing and racer database initialized');
  } catch (err) {
    console.error('Failed to initialize modules:', err);
  }

  // Listen to timing events
  raceTiming.on('run-started', (run) => {
    console.log(`Run started: Bib ${run.bibNumber}`);
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('timing:run-started', run);
    });
  });

  raceTiming.on('run-completed', async (run) => {
    console.log(`Run completed: Bib ${run.bibNumber} - ${run.adjustedTime}s`);

    try {
      await racerDB.updateBestTime(
        run.racerId,
        run.metadata?.course || 'left',
        run.totalTime,
        run.adjustedTime
      );
    } catch (err) {
      console.error('Failed to update best time:', err);
    }

    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('timing:run-completed', run);
    });
  });

  raceTiming.on('run-dnf', (run) => {
    console.log(`Run DNF: Bib ${run.bibNumber}`);
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('timing:run-dnf', run);
    });
  });

  raceTiming.on('run-disqualified', (data) => {
    console.log(`Run DSQ: Bib ${data.run?.bibNumber} - ${data.run?.dsqReason}`);
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('timing:run-disqualified', data);
    });
  });

  // Listen to racer database events
  racerDB.on('racer-saved', (racer) => {
    console.log(`Racer saved: ${racer.firstName} ${racer.lastName}`);
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('racers:racer-saved', racer);
    });
  });

  racerDB.on('best-time-updated', (data) => {
    console.log(`Best time updated for ${data.racer.firstName}: ${data.time}s`);
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('racers:best-time-updated', data);
    });
  });

});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle updates from USB
ipcMain.handle('install-update-from-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'OpenRacer Updates', extensions: ['exe', 'dmg', 'AppImage'] }
    ]
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    // In a real implementation, you'd verify and install the update here
    return { success: true, path: result.filePaths[0] };
  }
  
  return { success: false };
});

// ==================== RACER DATABASE HANDLERS ====================

// Search for a racer
ipcMain.handle('racers:search', async (event, query, options) => {
  try {
    return await racerDB.findRacer(query, options);
  } catch (err) {
    return { error: err.message };
  }
});

// Get autocomplete suggestions
ipcMain.handle('racers:autocomplete', async (event, query, limit) => {
  try {
    return racerDB.getAutocompleteSuggestions(query, limit);
  } catch (err) {
    return { error: err.message };
  }
});

// Save a racer
ipcMain.handle('racers:save', async (event, racerData) => {
  try {
    return await racerDB.saveRacer(racerData);
  } catch (err) {
    return { error: err.message };
  }
});

// Get next available bib number
ipcMain.handle('racers:next-bib', async () => {
  try {
    return racerDB.getNextBibNumber();
  } catch (err) {
    return { error: err.message };
  }
});

// Get today's racers
ipcMain.handle('racers:today', async () => {
  try {
    return racerDB.getTodaysRacers();
  } catch (err) {
    return { error: err.message };
  }
});

// Check if racer needs waiver
ipcMain.handle('racers:needs-waiver', async (event, racerId) => {
  try {
    const result = await racerDB.findRacer(racerId);
    if (result.racer) {
      return racerDB.needsWaiver(result.racer);
    }
    return false;
  } catch (err) {
    return { error: err.message };
  }
});

// Sign waiver
ipcMain.handle('racers:sign-waiver', async (event, racerId) => {
  try {
    return await racerDB.signWaiver(racerId);
  } catch (err) {
    return { error: err.message };
  }
});

// Get racer statistics
ipcMain.handle('racers:stats', async () => {
  try {
    return racerDB.getStatistics();
  } catch (err) {
    return { error: err.message };
  }
});

// Export racers
ipcMain.handle('racers:export', async (event, includeAllHistory) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Racer Database',
      defaultPath: `racers-export-${Date.now()}.json`,
      filters: [
        { name: 'JSON', extensions: ['json'] }
      ]
    });

    if (!result.canceled && result.filePath) {
      await racerDB.exportToJSON(result.filePath, includeAllHistory);
      return { success: true, filePath: result.filePath };
    }

    return { canceled: true };
  } catch (err) {
    return { error: err.message };
  }
});

// Import racers
ipcMain.handle('racers:import', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Import Racer Database',
      properties: ['openFile'],
      filters: [
        { name: 'JSON', extensions: ['json'] }
      ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const imported = await racerDB.importFromJSON(result.filePaths[0]);
      return { success: true, count: imported.count };
    }

    return { canceled: true };
  } catch (err) {
    return { error: err.message };
  }
});

// Clear today's racers (new day)
ipcMain.handle('racers:clear-today', async () => {
  try {
    return await racerDB.clearTodaysRacers();
  } catch (err) {
    return { error: err.message };
  }
});

// Sync with cloud (subscription feature)
ipcMain.handle('racers:sync-cloud', async (event, options) => {
  try {
    // Check subscription status
    const config = await loadConfig();
    const isSubscribed = config.subscriptionExpiry && 
                        new Date(config.subscriptionExpiry) > new Date();
    
    const hasInternet = await checkInternetConnection();
    
    return await racerDB.syncWithCloud({
      isSubscribed,
      isOnline: hasInternet,
      ...options
    });
  } catch (err) {
    return { error: err.message };
  }
});

// Start a new race session
ipcMain.handle('timing:start-race', async (event, raceId, raceName, courseData) => {
  try {
    return await raceTiming.startRaceSession(raceId, raceName, courseData);
  } catch (err) {
    return { error: err.message };
  }
});

// Start a run
ipcMain.handle('timing:start-run', async (event, racerId, bibNumber, metadata) => {
  try {
    return await raceTiming.startRun(racerId, bibNumber, metadata);
  } catch (err) {
    return { error: err.message };
  }
});

// Finish a run
ipcMain.handle('timing:finish-run', async (event, racerId, finishTime) => {
  try {
    return await raceTiming.finishRun(racerId, finishTime);
  } catch (err) {
    return { error: err.message };
  }
});

// Mark DNF
ipcMain.handle('timing:mark-dnf', async (event, racerId, reason, gate) => {
  try {
    return await raceTiming.markDNF(racerId, reason, gate);
  } catch (err) {
    return { error: err.message };
  }
});

// Disqualify run
ipcMain.handle('timing:disqualify', async (event, racerId, reason) => {
  try {
    return await raceTiming.disqualifyRun(racerId, reason);
  } catch (err) {
    return { error: err.message };
  }
});

// Add penalty
ipcMain.handle('timing:add-penalty', async (event, racerId, seconds, reason) => {
  try {
    return await raceTiming.addPenalty(racerId, seconds, reason);
  } catch (err) {
    return { error: err.message };
  }
});

// Get active runs
ipcMain.handle('timing:get-active', async () => {
  try {
    return raceTiming.getActiveRuns();
  } catch (err) {
    return { error: err.message };
  }
});

// Get completed runs
ipcMain.handle('timing:get-completed', async (event, sortBy) => {
  try {
    return raceTiming.getCompletedRuns(sortBy);
  } catch (err) {
    return { error: err.message };
  }
});

// Get leaderboard
ipcMain.handle('timing:get-leaderboard', async () => {
  try {
    return raceTiming.getLeaderboard();
  } catch (err) {
    return { error: err.message };
  }
});

// Get statistics
ipcMain.handle('timing:get-stats', async () => {
  try {
    return raceTiming.getStatistics();
  } catch (err) {
    return { error: err.message };
  }
});

// Export results
ipcMain.handle('timing:export', async (event, format) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Race Results',
      defaultPath: `race-results-${Date.now()}.json`,
      filters: [
        { name: 'JSON', extensions: ['json'] }
      ]
    });

    if (!result.canceled && result.filePath) {
      await raceTiming.exportToJSON(result.filePath);
      return { success: true, filePath: result.filePath };
    }

    return { canceled: true };
  } catch (err) {
    return { error: err.message };
  }
});

// Reset timing system
ipcMain.handle('timing:reset', async () => {
  try {
    return await raceTiming.reset();
  } catch (err) {
    return { error: err.message };
  }
});