// ui/components/timing-panel.js
// This is a UI component that uses the race timing module

/**
 * Timing Panel Component
 * Provides UI for starting/stopping runs and displaying active runs
 */
class TimingPanel {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.activeRuns = [];
    this.currentRacerId = null;
    this.currentBibNumber = null;
    
    if (!this.container) {
      throw new Error(`Container element '${containerId}' not found`);
    }

    this.init();
  }

  /**
   * Initialize the component
   */
  async init() {
    this.render();
    this.attachEventListeners();
    await this.loadActiveRuns();
    this.setupRealtimeUpdates();
  }

  /**
   * Render the component HTML
   */
  render() {
    this.container.innerHTML = `
      <div class="timing-panel">
        <div class="timing-header">
          <h2>Race Timing</h2>
          <div class="timing-status">
            <span class="status-indicator"></span>
            <span id="statusText">Ready</span>
          </div>
        </div>

        <div class="timing-controls">
          <div class="input-group">
            <label for="racerIdInput">Racer ID:</label>
            <input type="text" id="racerIdInput" placeholder="Enter racer ID" />
          </div>
          
          <div class="input-group">
            <label for="bibNumberInput">Bib Number:</label>
            <input type="number" id="bibNumberInput" placeholder="123" min="1" />
          </div>

          <div class="button-group">
            <button id="startRunBtn" class="btn btn-primary btn-large">
              <span class="btn-icon">🏁</span>
              Start Run
            </button>
            <button id="finishRunBtn" class="btn btn-success btn-large" disabled>
              <span class="btn-icon">✓</span>
              Finish Run
            </button>
          </div>

          <div class="button-group-secondary">
            <button id="dnfBtn" class="btn btn-warning" disabled>DNF</button>
            <button id="dsqBtn" class="btn btn-danger" disabled>DSQ</button>
          </div>
        </div>

        <div class="active-runs-section">
          <h3>Active Runs</h3>
          <div id="activeRunsList" class="active-runs-list">
            <p class="empty-state">No active runs</p>
          </div>
        </div>

        <div class="quick-stats">
          <div class="stat-card">
            <span class="stat-label">Total Runs</span>
            <span class="stat-value" id="totalRuns">0</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Active</span>
            <span class="stat-value" id="activeCount">0</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Fastest</span>
            <span class="stat-value" id="fastestTime">--</span>
          </div>
        </div>
      </div>
    `;

    this.addStyles();
  }

  /**
   * Add component-specific styles
   */
  addStyles() {
    if (document.getElementById('timing-panel-styles')) return;

    const style = document.createElement('style');
    style.id = 'timing-panel-styles';
    style.textContent = `
      .timing-panel {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: 24px;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .timing-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }

      .timing-header h2 {
        margin: 0;
        font-size: 24px;
        font-weight: 600;
      }

      .timing-status {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 6px;
      }

      .status-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #4ade80;
        animation: pulse 2s infinite;
      }

      .timing-controls {
        margin-bottom: 32px;
      }

      .input-group {
        margin-bottom: 16px;
      }

      .input-group label {
        display: block;
        margin-bottom: 8px;
        font-size: 14px;
        font-weight: 500;
        color: #a0a0a0;
      }

      .input-group input {
        width: 100%;
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        color: #e0e0e0;
        font-size: 16px;
        transition: all 0.2s;
      }

      .input-group input:focus {
        outline: none;
        border-color: #667eea;
        background: rgba(255, 255, 255, 0.08);
      }

      .button-group {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 12px;
      }

      .button-group-secondary {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .btn-large {
        padding: 16px 24px;
        font-size: 16px;
      }

      .btn-icon {
        font-size: 20px;
        margin-right: 8px;
      }

      .btn-success {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
      }

      .btn-success:hover:not(:disabled) {
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
      }

      .btn-warning {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        color: white;
      }

      .btn-danger {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
      }

      .btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        transform: none !important;
      }

      .active-runs-section {
        margin-bottom: 24px;
      }

      .active-runs-section h3 {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 16px;
      }

      .active-runs-list {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 8px;
        padding: 16px;
        min-height: 100px;
      }

      .empty-state {
        text-align: center;
        color: #666;
        font-style: italic;
      }

      .run-item {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: all 0.2s;
      }

      .run-item:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: #667eea;
      }

      .run-item-info {
        display: flex;
        gap: 16px;
        align-items: center;
      }

      .run-bib {
        font-size: 24px;
        font-weight: bold;
        color: #667eea;
      }

      .run-timer {
        font-size: 18px;
        font-family: monospace;
        color: #4ade80;
      }

      .quick-stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
      }

      .stat-card {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 8px;
        padding: 16px;
        text-align: center;
      }

      .stat-label {
        display: block;
        font-size: 12px;
        color: #888;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .stat-value {
        display: block;
        font-size: 24px;
        font-weight: bold;
        color: #667eea;
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Start run button
    document.getElementById('startRunBtn').addEventListener('click', () => {
      this.handleStartRun();
    });

    // Finish run button
    document.getElementById('finishRunBtn').addEventListener('click', () => {
      this.handleFinishRun();
    });

    // DNF button
    document.getElementById('dnfBtn').addEventListener('click', () => {
      this.handleDNF();
    });

    // DSQ button
    document.getElementById('dsqBtn').addEventListener('click', () => {
      this.handleDSQ();
    });

    // Enter key in inputs
    document.getElementById('racerIdInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('bibNumberInput').focus();
      }
    });

    document.getElementById('bibNumberInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleStartRun();
      }
    });
  }

  /**
   * Setup real-time updates from the backend
   */
  setupRealtimeUpdates() {
    // Listen for run started events
    window.raceTiming.onRunStarted((run) => {
      this.activeRuns.push(run);
      this.updateActiveRunsList();
      this.updateStats();
      this.showNotification('Run Started', `Bib ${run.bibNumber} started`);
    });

    // Listen for run completed events
    window.raceTiming.onRunCompleted((run) => {
      this.activeRuns = this.activeRuns.filter(r => r.racerId !== run.racerId);
      this.updateActiveRunsList();
      this.updateStats();
      this.showNotification('Run Completed', `Bib ${run.bibNumber}: ${run.adjustedTime}s`);
      
      // Clear selection if this was the active racer
      if (this.currentRacerId === run.racerId) {
        this.clearSelection();
      }
    });

    // Listen for DNF events
    window.raceTiming.onRunDNF((run) => {
      this.activeRuns = this.activeRuns.filter(r => r.racerId !== run.racerId);
      this.updateActiveRunsList();
      this.updateStats();
      this.showNotification('DNF', `Bib ${run.bibNumber} did not finish`);
      
      if (this.currentRacerId === run.racerId) {
        this.clearSelection();
      }
    });
  }

  /**
   * Handle start run button click
   */
  async handleStartRun() {
    const racerId = document.getElementById('racerIdInput').value.trim();
    const bibNumber = parseInt(document.getElementById('bibNumberInput').value);

    if (!racerId || !bibNumber) {
      this.showNotification('Error', 'Please enter both Racer ID and Bib Number', 'error');
      return;
    }

    try {
      const result = await window.raceTiming.startRun(racerId, bibNumber);
      
      if (result.error) {
        this.showNotification('Error', result.error, 'error');
        return;
      }

      // Store current racer for finish
      this.currentRacerId = racerId;
      this.currentBibNumber = bibNumber;

      // Enable finish/dnf/dsq buttons
      document.getElementById('finishRunBtn').disabled = false;
      document.getElementById('dnfBtn').disabled = false;
      document.getElementById('dsqBtn').disabled = false;

      // Disable start button
      document.getElementById('startRunBtn').disabled = true;

    } catch (err) {
      this.showNotification('Error', err.message, 'error');
    }
  }

  /**
   * Handle finish run button click
   */
  async handleFinishRun() {
    if (!this.currentRacerId) return;

    try {
      const result = await window.raceTiming.finishRun(this.currentRacerId);
      
      if (result.error) {
        this.showNotification('Error', result.error, 'error');
        return;
      }

      this.clearSelection();

    } catch (err) {
      this.showNotification('Error', err.message, 'error');
    }
  }

  /**
   * Handle DNF button click
   */
  async handleDNF() {
    if (!this.currentRacerId) return;

    const reason = prompt('DNF Reason (optional):', 'Did Not Finish');
    if (reason === null) return; // User cancelled

    try {
      const result = await window.raceTiming.markDNF(this.currentRacerId, reason);
      
      if (result.error) {
        this.showNotification('Error', result.error, 'error');
        return;
      }

      this.clearSelection();

    } catch (err) {
      this.showNotification('Error', err.message, 'error');
    }
  }

  /**
   * Handle DSQ button click
   */
  async handleDSQ() {
    if (!this.currentRacerId) return;

    const reason = prompt('Disqualification Reason:', 'Missed Gate');
    if (!reason) return;

    try {
      const result = await window.raceTiming.disqualify(this.currentRacerId, reason);
      
      if (result.error) {
        this.showNotification('Error', result.error, 'error');
        return;
      }

      this.clearSelection();

    } catch (err) {
      this.showNotification('Error', err.message, 'error');
    }
  }

  /**
   * Clear current selection and reset UI
   */
  clearSelection() {
    this.currentRacerId = null;
    this.currentBibNumber = null;
    
    document.getElementById('racerIdInput').value = '';
    document.getElementById('bibNumberInput').value = '';
    document.getElementById('startRunBtn').disabled = false;
    document.getElementById('finishRunBtn').disabled = true;
    document.getElementById('dnfBtn').disabled = true;
    document.getElementById('dsqBtn').disabled = true;
  }

  /**
   * Load active runs from backend
   */
  async loadActiveRuns() {
    try {
      this.activeRuns = await window.raceTiming.getActiveRuns() || [];
      this.updateActiveRunsList();
      this.updateStats();
    } catch (err) {
      console.error('Failed to load active runs:', err);
    }
  }

  /**
   * Update the active runs list display
   */
  updateActiveRunsList() {
    const container = document.getElementById('activeRunsList');
    
    if (this.activeRuns.length === 0) {
      container.innerHTML = '<p class="empty-state">No active runs</p>';
      document.getElementById('activeCount').textContent = '0';
      return;
    }

    container.innerHTML = this.activeRuns.map(run => {
      const elapsedMs = Date.now() - run.startTime;
      const elapsedSec = (elapsedMs / 1000).toFixed(2);
      
      return `
        <div class="run-item" data-racer-id="${run.racerId}">
          <div class="run-item-info">
            <span class="run-bib">#${run.bibNumber}</span>
            <span>Racer: ${run.racerId}</span>
          </div>
          <span class="run-timer">${elapsedSec}s</span>
        </div>
      `;
    }).join('');

    document.getElementById('activeCount').textContent = this.activeRuns.length;

    // Update timers every second
    setTimeout(() => this.updateActiveRunsList(), 1000);
  }

  /**
   * Update statistics display
   */
  async updateStats() {
    try {
      const stats = await window.raceTiming.getStatistics();
      
      document.getElementById('totalRuns').textContent = stats.totalRuns || 0;
      document.getElementById('fastestTime').textContent = 
        stats.fastestTime ? `${stats.fastestTime.toFixed(3)}s` : '--';
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }

  /**
   * Show notification
   */
  showNotification(title, message, type = 'info') {
    // Use the existing notification system from the main app
    if (window.showNotification) {
      window.showNotification(title, message);
    } else {
      console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
    }
  }
}

// Make available globally
window.TimingPanel = TimingPanel;