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

async handleRacerSearch(course, query) {
  if (!query || query.length < 2) {
    this.hideSuggestions(course);
    this.clearRacerInfo(course);
    return;
  }

  try {
    // Get autocomplete suggestions from database
    const suggestions = await window.racerDB.autocomplete(query, 5);
    
    if (suggestions && suggestions.length > 0) {
      this.showSuggestions(course, suggestions);
    } else {
      this.hideSuggestions(course);
    }
  } catch (err) {
    console.error('Autocomplete error:', err);
    this.hideSuggestions(course);
  }
},

  onRunDNF: (callback) => {
    ipcRenderer.on('timing:run-dnf', (event, run) => callback(run));
    return () => ipcRenderer.removeListener('timing:run-dnf', callback);
  },

  onRunDisqualified: (callback) => {
    ipcRenderer.on('timing:run-disqualified', (event, data) => callback(data));
    return () => ipcRenderer.removeListener('timing:run-disqualified', callback);
  },

  clearRacerInfo(course) {
    const infoContainer = document.querySelector(`.racer-info-display[data-course="${course}"]`);
    if (infoContainer) {
      infoContainer.style.display = 'none';
      infoContainer.innerHTML = '';
    }
  },

  calculateAge(birthdate) {
    if (!birthdate) return null;
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  },

  displayRacerInfo(course, racer) {
    const infoContainer = document.querySelector(`.racer-info-display[data-course="${course}"]`);
    if (!infoContainer) return;

    const age = this.calculateAge(racer.birthdate);
    const genderDisplay = racer.gender === 'M' ? 'Male' : racer.gender === 'F' ? 'Female' : 'Unspecified';
    const disciplineDisplay = racer.discipline ? racer.discipline.charAt(0).toUpperCase() + racer.discipline.slice(1) : 'Alpine';
    
    infoContainer.innerHTML = `
      <div class="racer-info-header">
        <div class="racer-info-main">
          <span class="racer-name">${racer.firstName} ${racer.lastName}</span>
          <span class="racer-bib">#${racer.bibNumber}</span>
        </div>
        <div class="racer-info-details">
          <span class="info-badge">${genderDisplay}</span>
          <span class="info-badge">${disciplineDisplay}</span>
          ${age ? `<span class="info-badge">Age ${age}</span>` : ''}
          ${racer.hasRacePass ? '<span class="info-badge badge-success">✓ Pass</span>' : ''}
        </div>
      </div>
    `;
    
    infoContainer.style.display = 'block';
    this.selectedRacers[course] = racer;
  }

});

// Add separate namespace for racer database
contextBridge.exposeInMainWorld('racerDB', {
  // Search for a racer
  search: (query, options) =>
    ipcRenderer.invoke('racers:search', query, options),

  // Get autocomplete suggestions
  autocomplete: (query, limit) =>
    ipcRenderer.invoke('racers:autocomplete', query, limit),

  // Save a racer
  save: (racerData) =>
    ipcRenderer.invoke('racers:save', racerData),

  // Get next available bib number
  getNextBib: () =>
    ipcRenderer.invoke('racers:next-bib'),

  // Get today's racers
  getTodaysRacers: () =>
    ipcRenderer.invoke('racers:today'),

  // Check if racer needs waiver
  needsWaiver: (racerId) =>
    ipcRenderer.invoke('racers:needs-waiver', racerId),

  // Sign waiver
  signWaiver: (racerId) =>
    ipcRenderer.invoke('racers:sign-waiver', racerId),

  // Get statistics
  getStatistics: () =>
    ipcRenderer.invoke('racers:stats'),

  // Export data
  exportToJSON: (includeAllHistory) =>
    ipcRenderer.invoke('racers:export', includeAllHistory),

  // Import data
  importFromJSON: () =>
    ipcRenderer.invoke('racers:import'),

  // Clear today's racers
  clearTodays: () =>
    ipcRenderer.invoke('racers:clear-today'),

  // Sync with cloud
  syncWithCloud: (config) =>
    ipcRenderer.invoke('racers:sync-cloud', config)
});