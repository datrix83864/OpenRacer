// modules/race-timing.js
// This is a complete, working example of a modular feature

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

/**
 * Race Timing Module
 * Handles all race timing functionality in isolation
 * Can be tested, debugged, and maintained separately from other features
 */
class RaceTiming extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Configuration
    this.dataDir = options.dataDir || './data';
    this.autoSave = options.autoSave !== false; // Default true
    this.precision = options.precision || 3; // Milliseconds precision
    
    // State
    this.activeRuns = new Map(); // racerId -> run data
    this.completedRuns = [];
    this.currentRaceId = null;
    this.startGateOpen = false;
    
    // Statistics
    this.stats = {
      totalRuns: 0,
      dnfCount: 0,
      averageTime: 0,
      fastestTime: null
    };
  }

  /**
   * Initialize the timing system
   * Loads previous state if it exists
   */
  async initialize() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await this.loadState();
      this.emit('initialized');
      return { success: true };
    } catch (err) {
      console.error('Failed to initialize timing system:', err);
      throw err;
    }
  }

  /**
   * Start a new race session
   */
  async startRaceSession(raceId, raceName, courseData) {
    this.currentRaceId = raceId;
    this.activeRuns.clear();
    this.completedRuns = [];
    this.startGateOpen = true;
    
    this.emit('race-session-started', {
      raceId,
      raceName,
      courseData,
      startTime: Date.now()
    });

    await this.saveState();
    
    return {
      raceId,
      status: 'active',
      startTime: Date.now()
    };
  }

  /**
   * Start timing for a racer
   */
  async startRun(racerId, bibNumber, metadata = {}) {
    // Validation
    if (!this.startGateOpen) {
      throw new Error('Start gate is not open');
    }

    if (this.activeRuns.has(racerId)) {
      throw new Error(`Racer ${bibNumber} already has an active run`);
    }

    // Create run record
    const run = {
      runId: this.generateRunId(),
      raceId: this.currentRaceId,
      racerId,
      bibNumber,
      startTime: Date.now(),
      finishTime: null,
      totalTime: null,
      status: 'running',
      metadata: metadata || {},
      penalties: [],
      createdAt: new Date().toISOString()
    };

    // Store active run
    this.activeRuns.set(racerId, run);
    
    // Emit event for UI updates
    this.emit('run-started', run);

    // Auto-save if enabled
    if (this.autoSave) {
      await this.saveState();
    }

    return run;
  }

  /**
   * Record finish time for a racer
   */
  async finishRun(racerId, finishTime = null) {
    const run = this.activeRuns.get(racerId);
    
    if (!run) {
      throw new Error(`No active run found for racer ${racerId}`);
    }

    // Calculate finish
    run.finishTime = finishTime || Date.now();
    run.totalTime = this.calculateTime(run.startTime, run.finishTime);
    run.status = 'completed';
    run.completedAt = new Date().toISOString();

    // Apply any penalties
    run.adjustedTime = this.applyPenalties(run.totalTime, run.penalties);

    // Move to completed
    this.activeRuns.delete(racerId);
    this.completedRuns.push(run);

    // Update statistics
    this.updateStatistics(run);

    // Emit event
    this.emit('run-completed', run);

    // Auto-save
    if (this.autoSave) {
      await this.saveState();
    }

    return run;
  }

  /**
   * Mark a run as Did Not Finish (DNF)
   */
  async markDNF(racerId, reason = 'Did Not Finish', gate = null) {
    const run = this.activeRuns.get(racerId);
    
    if (!run) {
      throw new Error(`No active run found for racer ${racerId}`);
    }

    // Update run status
    run.status = 'dnf';
    run.dnfReason = reason;
    run.dnfGate = gate;
    run.dnfTime = Date.now();
    run.completedAt = new Date().toISOString();

    // Move to completed
    this.activeRuns.delete(racerId);
    this.completedRuns.push(run);

    // Update statistics
    this.stats.dnfCount++;

    // Emit event
    this.emit('run-dnf', run);

    // Auto-save
    if (this.autoSave) {
      await this.saveState();
    }

    return run;
  }

  /**
   * Mark a run as Disqualified (DSQ)
   */
  async disqualifyRun(racerId, reason) {
    const run = this.activeRuns.get(racerId) || 
                 this.completedRuns.find(r => r.racerId === racerId);
    
    if (!run) {
      throw new Error(`No run found for racer ${racerId}`);
    }

    // Update status
    const previousStatus = run.status;
    run.status = 'disqualified';
    run.dsqReason = reason;
    run.dsqTime = Date.now();

    // If was active, move to completed
    if (this.activeRuns.has(racerId)) {
      this.activeRuns.delete(racerId);
      this.completedRuns.push(run);
    }

    // Emit event
    this.emit('run-disqualified', { run, previousStatus });

    // Auto-save
    if (this.autoSave) {
      await this.saveState();
    }

    return run;
  }

  /**
   * Add a time penalty to a run
   */
  async addPenalty(racerId, penaltySeconds, reason) {
    const run = this.completedRuns.find(r => r.racerId === racerId);
    
    if (!run) {
      throw new Error(`No completed run found for racer ${racerId}`);
    }

    const penalty = {
      seconds: penaltySeconds,
      reason,
      addedAt: Date.now()
    };

    run.penalties.push(penalty);
    run.adjustedTime = this.applyPenalties(run.totalTime, run.penalties);

    // Emit event
    this.emit('penalty-added', { run, penalty });

    // Auto-save
    if (this.autoSave) {
      await this.saveState();
    }

    return run;
  }

  /**
   * Get all active runs
   */
  getActiveRuns() {
    return Array.from(this.activeRuns.values());
  }

  /**
   * Get all completed runs
   */
  getCompletedRuns(sortBy = 'adjustedTime') {
    const runs = [...this.completedRuns].filter(r => r.status === 'completed');
    
    if (sortBy === 'adjustedTime') {
      runs.sort((a, b) => a.adjustedTime - b.adjustedTime);
    } else if (sortBy === 'bibNumber') {
      runs.sort((a, b) => a.bibNumber - b.bibNumber);
    } else if (sortBy === 'finishTime') {
      runs.sort((a, b) => a.finishTime - b.finishTime);
    }

    return runs;
  }

  /**
   * Get leaderboard (ranked results)
   */
  getLeaderboard() {
    const completedRuns = this.getCompletedRuns('adjustedTime');
    
    return completedRuns.map((run, index) => ({
      rank: index + 1,
      ...run,
      behindLeader: index === 0 ? 0 : run.adjustedTime - completedRuns[0].adjustedTime
    }));
  }

  /**
   * Get current statistics
   */
  getStatistics() {
    return { ...this.stats };
  }

  /**
   * Calculate time between start and finish
   */
  calculateTime(startTime, finishTime) {
    const diff = finishTime - startTime;
    return parseFloat((diff / 1000).toFixed(this.precision));
  }

  /**
   * Apply penalties to a time
   */
  applyPenalties(baseTime, penalties) {
    const totalPenalty = penalties.reduce((sum, p) => sum + p.seconds, 0);
    return baseTime + totalPenalty;
  }

  /**
   * Update statistics after a run completes
   */
  updateStatistics(run) {
    this.stats.totalRuns++;

    // Calculate average
    const completedTimes = this.completedRuns
      .filter(r => r.status === 'completed')
      .map(r => r.adjustedTime);
    
    if (completedTimes.length > 0) {
      this.stats.averageTime = completedTimes.reduce((a, b) => a + b, 0) / completedTimes.length;
      this.stats.fastestTime = Math.min(...completedTimes);
    }
  }

  /**
   * Generate unique run ID
   */
  generateRunId() {
    return `RUN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save current state to disk
   */
  async saveState() {
    try {
      const state = {
        currentRaceId: this.currentRaceId,
        startGateOpen: this.startGateOpen,
        activeRuns: Array.from(this.activeRuns.entries()),
        completedRuns: this.completedRuns,
        stats: this.stats,
        lastSaved: new Date().toISOString()
      };

      const filePath = path.join(this.dataDir, 'timing-state.json');
      await fs.writeFile(filePath, JSON.stringify(state, null, 2));
      
      this.emit('state-saved', { filePath, timestamp: Date.now() });
      
      return { success: true, filePath };
    } catch (err) {
      console.error('Failed to save timing state:', err);
      throw err;
    }
  }

  /**
   * Load state from disk
   */
  async loadState() {
    try {
      const filePath = path.join(this.dataDir, 'timing-state.json');
      const data = await fs.readFile(filePath, 'utf8');
      const state = JSON.parse(data);

      this.currentRaceId = state.currentRaceId;
      this.startGateOpen = state.startGateOpen;
      this.activeRuns = new Map(state.activeRuns);
      this.completedRuns = state.completedRuns || [];
      this.stats = state.stats || this.stats;

      this.emit('state-loaded', { filePath, timestamp: Date.now() });
      
      return { success: true, state };
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.log('No previous timing state found, starting fresh');
        return { success: true, fresh: true };
      }
      throw err;
    }
  }

  /**
   * Export runs to JSON
   */
  async exportToJSON(filePath) {
    const exportData = {
      raceId: this.currentRaceId,
      exportedAt: new Date().toISOString(),
      completedRuns: this.completedRuns,
      statistics: this.stats
    };

    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2));
    
    return { success: true, filePath, runCount: this.completedRuns.length };
  }

  /**
   * Reset timing system for new race
   */
  async reset() {
    this.activeRuns.clear();
    this.completedRuns = [];
    this.currentRaceId = null;
    this.startGateOpen = false;
    this.stats = {
      totalRuns: 0,
      dnfCount: 0,
      averageTime: 0,
      fastestTime: null
    };

    this.emit('reset');

    if (this.autoSave) {
      await this.saveState();
    }

    return { success: true };
  }
}

module.exports = RaceTiming;