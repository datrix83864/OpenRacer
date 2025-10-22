// preload.js - Bridge between main and renderer process
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  checkInternet: () => ipcRenderer.invoke('check-internet'),
  checkUpdates: () => ipcRenderer.invoke('check-updates'),
  skipVersion: (version) => ipcRenderer.invoke('skip-version', version),
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  openUpdateDialog: (updateInfo) => ipcRenderer.invoke('open-update-dialog', updateInfo),
  installUpdateFromFile: () => ipcRenderer.invoke('install-update-from-file')
});

// Add separate namespace for race timing
contextBridge.exposeInMainWorld('raceTiming', {
  // Race session management
  startRace: (raceId, raceName, courseData) => 
    ipcRenderer.invoke('timing:start-race', raceId, raceName, courseData),
  
  // Run management
  startRun: (racerId, bibNumber, metadata) => 
    ipcRenderer.invoke('timing:start-run', racerId, bibNumber, metadata),
  
  finishRun: (racerId, finishTime) => 
    ipcRenderer.invoke('timing:finish-run', racerId, finishTime),
  
  markDNF: (racerId, reason, gate) => 
    ipcRenderer.invoke('timing:mark-dnf', racerId, reason, gate),
  
  disqualify: (racerId, reason) => 
    ipcRenderer.invoke('timing:disqualify', racerId, reason),
  
  addPenalty: (racerId, seconds, reason) => 
    ipcRenderer.invoke('timing:add-penalty', racerId, seconds, reason),
  
  // Data retrieval
  getActiveRuns: () => 
    ipcRenderer.invoke('timing:get-active'),
  
  getCompletedRuns: (sortBy) => 
    ipcRenderer.invoke('timing:get-completed', sortBy),
  
  getLeaderboard: () => 
    ipcRenderer.invoke('timing:get-leaderboard'),
  
  getStatistics: () => 
    ipcRenderer.invoke('timing:get-stats'),
  
  // Export and reset
  export: (format) => 
    ipcRenderer.invoke('timing:export', format),
  
  reset: () => 
    ipcRenderer.invoke('timing:reset'),
  
  // Event listeners for real-time updates
  onRunStarted: (callback) => {
    ipcRenderer.on('timing:run-started', (event, run) => callback(run));
    // Return unsubscribe function
    return () => ipcRenderer.removeListener('timing:run-started', callback);
  },
  
  onRunCompleted: (callback) => {
    ipcRenderer.on('timing:run-completed', (event, run) => callback(run));
    return () => ipcRenderer.removeListener('timing:run-completed', callback);
  },
  
  onRunDNF: (callback) => {
    ipcRenderer.on('timing:run-dnf', (event, run) => callback(run));
    return () => ipcRenderer.removeListener('timing:run-dnf', callback);
  },
  
  onRunDisqualified: (callback) => {
    ipcRenderer.on('timing:run-disqualified', (event, data) => callback(data));
    return () => ipcRenderer.removeListener('timing:run-disqualified', callback);
  }
});