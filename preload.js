// preload.js - Bridge between main and renderer process
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  checkInternet: () => ipcRenderer.invoke('check-internet'),
  checkUpdates: () => ipcRenderer.invoke('check-updates'),
  skipVersion: (version) => ipcRenderer.invoke('skip-version', version),
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  openUpdateDialog: (updateInfo) => ipcRenderer.invoke('open-update-dialog', updateInfo),
  installUpdateFromFile: () => ipcRenderer.invoke('install-update-from-file')
});

contextBridge.exposeInMainWorld('raceTiming', {
  startRace: (raceId, raceName, courseData) =>
    ipcRenderer.invoke('timing:start-race', raceId, raceName, courseData),

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

  getActiveRuns: () =>
    ipcRenderer.invoke('timing:get-active'),

  getCompletedRuns: (sortBy) =>
    ipcRenderer.invoke('timing:get-completed', sortBy),

  getLeaderboard: () =>
    ipcRenderer.invoke('timing:get-leaderboard'),

  getStatistics: () =>
    ipcRenderer.invoke('timing:get-stats'),

  export: (format) =>
    ipcRenderer.invoke('timing:export', format),

  reset: () =>
    ipcRenderer.invoke('timing:reset'),

  onRunStarted: (callback) => {
    const wrapped = (event, run) => callback(run);
    ipcRenderer.on('timing:run-started', wrapped);
    return () => ipcRenderer.removeListener('timing:run-started', wrapped);
  },

  onRunCompleted: (callback) => {
    const wrapped = (event, run) => callback(run);
    ipcRenderer.on('timing:run-completed', wrapped);
    return () => ipcRenderer.removeListener('timing:run-completed', wrapped);
  },

  onRunDNF: (callback) => {
    const wrapped = (event, run) => callback(run);
    ipcRenderer.on('timing:run-dnf', wrapped);
    return () => ipcRenderer.removeListener('timing:run-dnf', wrapped);
  },

  onRunDisqualified: (callback) => {
    const wrapped = (event, data) => callback(data);
    ipcRenderer.on('timing:run-disqualified', wrapped);
    return () => ipcRenderer.removeListener('timing:run-disqualified', wrapped);
  }
});

contextBridge.exposeInMainWorld('hardware', {
  listPorts: () =>
    ipcRenderer.invoke('hardware:list-ports'),

  openGate: (portPath, baudRate, action) =>
    ipcRenderer.invoke('hardware:open-gate', portPath, baudRate, action),

  closeGate: () =>
    ipcRenderer.invoke('hardware:close-gate'),

  openScoreboard: (portPath, baudRate) =>
    ipcRenderer.invoke('hardware:open-scoreboard', portPath, baudRate),

  closeScoreboard: () =>
    ipcRenderer.invoke('hardware:close-scoreboard'),

  status: () =>
    ipcRenderer.invoke('hardware:status'),

  scoreboardSend: (text) =>
    ipcRenderer.invoke('hardware:scoreboard-send', text),

  scoreboardPushLeaderboard: (courseName) =>
    ipcRenderer.invoke('hardware:scoreboard-push-leaderboard', courseName),

  onGateTrigger: (callback) => {
    const wrapped = (event, data) => callback(data);
    ipcRenderer.on('hardware:gate-trigger', wrapped);
    return () => ipcRenderer.removeListener('hardware:gate-trigger', wrapped);
  },

  onGateFinish: (callback) => {
    const wrapped = (event, data) => callback(data);
    ipcRenderer.on('hardware:gate-finish', wrapped);
    return () => ipcRenderer.removeListener('hardware:gate-finish', wrapped);
  },

  onGateConnected: (callback) => {
    const wrapped = (event, data) => callback(data);
    ipcRenderer.on('hardware:gate-connected', wrapped);
    return () => ipcRenderer.removeListener('hardware:gate-connected', wrapped);
  },

  onGateDisconnected: (callback) => {
    const wrapped = () => callback();
    ipcRenderer.on('hardware:gate-disconnected', wrapped);
    return () => ipcRenderer.removeListener('hardware:gate-disconnected', wrapped);
  },

  onScoreboardConnected: (callback) => {
    const wrapped = (event, data) => callback(data);
    ipcRenderer.on('hardware:scoreboard-connected', wrapped);
    return () => ipcRenderer.removeListener('hardware:scoreboard-connected', wrapped);
  },

  onScoreboardDisconnected: (callback) => {
    const wrapped = () => callback();
    ipcRenderer.on('hardware:scoreboard-disconnected', wrapped);
    return () => ipcRenderer.removeListener('hardware:scoreboard-disconnected', wrapped);
  },
});

contextBridge.exposeInMainWorld('racerDB', {
  search: (query, options) => ipcRenderer.invoke('racers:search', query, options),
  autocomplete: (query, limit) => ipcRenderer.invoke('racers:autocomplete', query, limit),
  save: (racerData) => ipcRenderer.invoke('racers:save', racerData),
  nextBib: () => ipcRenderer.invoke('racers:next-bib'),
  today: () => ipcRenderer.invoke('racers:today'),
  needsWaiver: (racerId) => ipcRenderer.invoke('racers:needs-waiver', racerId),
  signWaiver: (racerId) => ipcRenderer.invoke('racers:sign-waiver', racerId),
  stats: () => ipcRenderer.invoke('racers:stats'),
  export: (includeAllHistory) => ipcRenderer.invoke('racers:export', includeAllHistory),
  import: () => ipcRenderer.invoke('racers:import'),
  clearToday: () => ipcRenderer.invoke('racers:clear-today'),
  syncCloud: (options) => ipcRenderer.invoke('racers:sync-cloud', options),

  onRacerSaved: (callback) => {
    const wrapped = (event, racer) => callback(racer);
    ipcRenderer.on('racers:racer-saved', wrapped);
    return () => ipcRenderer.removeListener('racers:racer-saved', wrapped);
  },

  onBestTimeUpdated: (callback) => {
    const wrapped = (event, data) => callback(data);
    ipcRenderer.on('racers:best-time-updated', wrapped);
    return () => ipcRenderer.removeListener('racers:best-time-updated', wrapped);
  }
});
