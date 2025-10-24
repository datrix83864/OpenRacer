// modules/racer-database.js
// Manages racer information with local and cloud sync

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

/**
 * Racer Database Module
 * Handles racer data with smart lookup: today's racers → local cache → cloud
 */
class RacerDatabase extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.dataDir = options.dataDir || './data/racers';
    this.mountainId = options.mountainId || 'default-mountain';
    this.autoSave = options.autoSave !== false;
    
    // In-memory caches
    this.todaysRacers = new Map(); // Racer ID → Racer data (fastest lookup)
    this.localCache = new Map();   // All racers from this mountain
    this.bibMapping = new Map();   // Bib → Racer ID for quick lookup
    
    // Today's date for session tracking
    this.today = new Date().toISOString().split('T')[0];
    
    // Mountain-specific settings
    this.requireWaiver = options.requireWaiver || false;
    this.seasonStart = options.seasonStart || new Date().getFullYear() + '-11-01';
  }

  /**
   * Initialize the database
   */
  async initialize() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await this.loadLocalCache();
      await this.loadTodaysRacers();
      this.emit('initialized');
      return { success: true };
    } catch (err) {
      console.error('Failed to initialize racer database:', err);
      throw err;
    }
  }

  /**
   * Search for a racer by ID or bib number
   * Priority: Today's racers → Local cache → Cloud (if subscribed)
   */
  async findRacer(query, options = {}) {
    const searchTerm = query.toString().trim().toUpperCase();
    
    // 1. Check today's racers first (fastest)
    let racer = this.searchTodaysRacers(searchTerm);
    if (racer) {
      return { racer, source: 'today', cached: true };
    }
    
    // 2. Check local cache (this mountain's history)
    racer = this.searchLocalCache(searchTerm);
    if (racer) {
      // Add to today's racers for faster future lookups
      this.todaysRacers.set(racer.id, racer);
      return { racer, source: 'local', cached: true };
    }
    
    // 3. Check cloud database (if subscribed and online)
    if (options.checkCloud && options.isSubscribed && options.isOnline) {
      racer = await this.searchCloud(searchTerm);
      if (racer) {
        // Cache locally
        this.localCache.set(racer.id, racer);
        this.todaysRacers.set(racer.id, racer);
        await this.saveLocalCache();
        return { racer, source: 'cloud', cached: false };
      }
    }
    
    return { racer: null, source: null };
  }

  /**
   * Search today's racers
   */
  searchTodaysRacers(query) {
    // Try direct ID match
    if (this.todaysRacers.has(query)) {
      return this.todaysRacers.get(query);
    }
    
    // Try bib number match
    if (this.bibMapping.has(query)) {
      const racerId = this.bibMapping.get(query);
      return this.todaysRacers.get(racerId);
    }
    
    // Try partial match on name
    for (const racer of this.todaysRacers.values()) {
      const fullName = `${racer.firstName} ${racer.lastName}`.toUpperCase();
      if (fullName.includes(query)) {
        return racer;
      }
    }
    
    return null;
  }

  /**
   * Search local cache
   */
  searchLocalCache(query) {
    // Try direct ID match
    if (this.localCache.has(query)) {
      return this.localCache.get(query);
    }
    
    // Try partial match
    for (const racer of this.localCache.values()) {
      if (racer.bibNumber === query) return racer;
      
      const fullName = `${racer.firstName} ${racer.lastName}`.toUpperCase();
      if (fullName.includes(query)) {
        return racer;
      }
    }
    
    return null;
  }

  /**
   * Search cloud database (placeholder - needs backend implementation)
   */
  async searchCloud(query) {
    // TODO: Implement cloud API call
    console.log('Cloud search for:', query);
    return null;
  }

  /**
   * Add or update a racer
   */
  async saveRacer(racerData) {
    const racer = {
      id: racerData.id || this.generateRacerId(racerData.lastName),
      bibNumber: racerData.bibNumber,
      firstName: racerData.firstName,
      lastName: racerData.lastName,
      dateOfBirth: racerData.dateOfBirth || null,
      gender: racerData.gender || 'U', // M, F, U (unspecified)
      discipline: racerData.discipline || 'alpine', // alpine, snowboard, etc.
      disabilities: racerData.disabilities || [],
      
      // Mountain-specific data
      hasRacePass: racerData.hasRacePass || false,
      waiverSigned: racerData.waiverSigned || false,
      waiverDate: racerData.waiverDate || null,
      lastRaceDate: racerData.lastRaceDate || this.today,
      
      // Best times tracking
      bestTimes: racerData.bestTimes || {
        courseA: { time: null, handicapped: null, date: null },
        courseB: { time: null, handicapped: null, date: null }
      },
      
      // Contact info (optional)
      email: racerData.email || null,
      phone: racerData.phone || null,
      
      // Metadata
      createdAt: racerData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mountainId: this.mountainId
    };
    
    // Add to caches
    this.todaysRacers.set(racer.id, racer);
    this.localCache.set(racer.id, racer);
    this.bibMapping.set(racer.bibNumber, racer.id);
    
    // Emit event
    this.emit('racer-saved', racer);
    
    // Auto-save
    if (this.autoSave) {
      await this.saveLocalCache();
      await this.saveTodaysRacers();
    }
    
    return racer;
  }

  /**
   * Update best time for a racer
   */
  async updateBestTime(racerId, course, time, handicappedTime) {
    const racer = this.todaysRacers.get(racerId) || this.localCache.get(racerId);
    
    if (!racer) {
      throw new Error(`Racer ${racerId} not found`);
    }
    
    const courseKey = course === 'left' ? 'courseA' : 'courseB';
    
    // Update if this is a new best
    const currentBest = racer.bestTimes[courseKey].handicapped;
    if (!currentBest || handicappedTime < currentBest) {
      racer.bestTimes[courseKey] = {
        time: time,
        handicapped: handicappedTime,
        date: this.today
      };
      
      racer.updatedAt = new Date().toISOString();
      
      this.emit('best-time-updated', { racer, course, time: handicappedTime });
      
      if (this.autoSave) {
        await this.saveLocalCache();
      }
    }
    
    return racer;
  }

  /**
   * Check if racer needs waiver
   */
  needsWaiver(racer) {
    if (!this.requireWaiver) return false;
    if (racer.waiverSigned && racer.waiverDate) {
      // Check if waiver is from current season
      const waiverDate = new Date(racer.waiverDate);
      const seasonStartDate = new Date(this.seasonStart);
      return waiverDate < seasonStartDate;
    }
    return true;
  }

  /**
   * Mark waiver as signed
   */
  async signWaiver(racerId) {
    const racer = this.todaysRacers.get(racerId) || this.localCache.get(racerId);
    
    if (!racer) {
      throw new Error(`Racer ${racerId} not found`);
    }
    
    racer.waiverSigned = true;
    racer.waiverDate = new Date().toISOString();
    racer.updatedAt = new Date().toISOString();
    
    this.emit('waiver-signed', racer);
    
    if (this.autoSave) {
      await this.saveLocalCache();
    }
    
    return racer;
  }

  /**
   * Get suggested next bib number
   */
  getNextBibNumber() {
    const usedBibs = new Set();
    
    // Collect all bibs from today's racers
    for (const racer of this.todaysRacers.values()) {
      if (racer.bibNumber) {
        usedBibs.add(parseInt(racer.bibNumber));
      }
    }
    
    // Find next available starting from 1
    let nextBib = 1;
    while (usedBibs.has(nextBib)) {
      nextBib++;
    }
    
    return nextBib.toString();
  }

  /**
   * Get all racers from today
   */
  getTodaysRacers() {
    return Array.from(this.todaysRacers.values()).sort((a, b) => {
      return parseInt(a.bibNumber) - parseInt(b.bibNumber);
    });
  }

  /**
   * Get autocomplete suggestions
   */
  getAutocompleteSuggestions(query, limit = 5) {
    const searchTerm = query.toString().trim().toUpperCase();
    const suggestions = [];
    
    // Search today's racers first
    for (const racer of this.todaysRacers.values()) {
      if (this.matchesQuery(racer, searchTerm)) {
        suggestions.push({ ...racer, source: 'today' });
      }
      if (suggestions.length >= limit) break;
    }
    
    // If not enough, search local cache
    if (suggestions.length < limit) {
      for (const racer of this.localCache.values()) {
        if (!this.todaysRacers.has(racer.id) && this.matchesQuery(racer, searchTerm)) {
          suggestions.push({ ...racer, source: 'local' });
        }
        if (suggestions.length >= limit) break;
      }
    }
    
    return suggestions;
  }

  /**
   * Check if racer matches search query
   */
  matchesQuery(racer, query) {
    const fullName = `${racer.firstName} ${racer.lastName}`.toUpperCase();
    return (
      racer.id.toUpperCase().includes(query) ||
      racer.bibNumber === query ||
      fullName.includes(query)
    );
  }

  /**
   * Calculate age from date of birth
   */
  calculateAge(dateOfBirth) {
    if (!dateOfBirth) return null;
    
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Generate unique racer ID
   * Format: First 3 letters of last name (uppercase) + 4 random digits
   * Example: John Smith → SMI2345
   */
  generateRacerId(lastName) {
    // Get first 3 letters of last name, pad with X if needed
    const letters = lastName.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 3).padEnd(3, 'X');
    
    // Generate random digits
    const digits = Math.floor(1 + Math.random() * 90000);
    
    const proposedId = `${letters}${digits}`;
    
    // Check if this ID already exists, if so, generate new digits
    if (this.localCache.has(proposedId) || this.todaysRacers.has(proposedId)) {
      return this.generateRacerId(lastName); // Recursive retry with new random digits
    }
    
    return proposedId;
  }

  /**
   * Load local cache from disk
   */
  async loadLocalCache() {
    try {
      const filePath = path.join(this.dataDir, `${this.mountainId}-racers.json`);
      const data = await fs.readFile(filePath, 'utf8');
      const racers = JSON.parse(data);
      
      this.localCache.clear();
      racers.forEach(racer => {
        this.localCache.set(racer.id, racer);
      });
      
      console.log(`Loaded ${this.localCache.size} racers from local cache`);
      return { success: true, count: this.localCache.size };
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.log('No local cache found, starting fresh');
        return { success: true, count: 0 };
      }
      throw err;
    }
  }

  /**
   * Save local cache to disk
   */
  async saveLocalCache() {
    try {
      const filePath = path.join(this.dataDir, `${this.mountainId}-racers.json`);
      const racers = Array.from(this.localCache.values());
      await fs.writeFile(filePath, JSON.stringify(racers, null, 2));
      
      this.emit('cache-saved', { count: racers.length });
      return { success: true };
    } catch (err) {
      console.error('Failed to save local cache:', err);
      throw err;
    }
  }

  /**
   * Load today's racers from disk
   */
  async loadTodaysRacers() {
    try {
      const filePath = path.join(this.dataDir, `${this.mountainId}-today-${this.today}.json`);
      const data = await fs.readFile(filePath, 'utf8');
      const racers = JSON.parse(data);
      
      this.todaysRacers.clear();
      this.bibMapping.clear();
      
      racers.forEach(racer => {
        this.todaysRacers.set(racer.id, racer);
        this.bibMapping.set(racer.bibNumber, racer.id);
      });
      
      console.log(`Loaded ${this.todaysRacers.size} racers from today`);
      return { success: true, count: this.todaysRacers.size };
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.log('No racers from today yet, starting fresh');
        return { success: true, count: 0 };
      }
      throw err;
    }
  }

  /**
   * Save today's racers to disk
   */
  async saveTodaysRacers() {
    try {
      const filePath = path.join(this.dataDir, `${this.mountainId}-today-${this.today}.json`);
      const racers = Array.from(this.todaysRacers.values());
      await fs.writeFile(filePath, JSON.stringify(racers, null, 2));
      
      this.emit('todays-racers-saved', { count: racers.length });
      return { success: true };
    } catch (err) {
      console.error('Failed to save today\'s racers:', err);
      throw err;
    }
  }

  /**
   * Export racer data
   */
  async exportToJSON(filePath, includeAllHistory = false) {
    const data = {
      mountainId: this.mountainId,
      exportDate: new Date().toISOString(),
      todaysRacers: Array.from(this.todaysRacers.values()),
      allRacers: includeAllHistory ? Array.from(this.localCache.values()) : []
    };
    
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    return { success: true, count: data.todaysRacers.length };
  }

  /**
   * Import racer data
   */
  async importFromJSON(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const imported = JSON.parse(data);
      
      let importedCount = 0;
      
      // Import all racers to local cache
      if (imported.allRacers) {
        imported.allRacers.forEach(racer => {
          this.localCache.set(racer.id, racer);
          importedCount++;
        });
      }
      
      // Import today's racers
      if (imported.todaysRacers) {
        imported.todaysRacers.forEach(racer => {
          this.todaysRacers.set(racer.id, racer);
          this.bibMapping.set(racer.bibNumber, racer.id);
        });
      }
      
      await this.saveLocalCache();
      await this.saveTodaysRacers();
      
      this.emit('data-imported', { count: importedCount });
      
      return { success: true, count: importedCount };
    } catch (err) {
      console.error('Failed to import data:', err);
      throw err;
    }
  }

  /**
   * Clear today's racers (new day start)
   */
  async clearTodaysRacers() {
    this.todaysRacers.clear();
    this.bibMapping.clear();
    this.today = new Date().toISOString().split('T')[0];
    
    await this.saveTodaysRacers();
    
    this.emit('todays-racers-cleared');
    return { success: true };
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      todaysRacersCount: this.todaysRacers.size,
      totalRacersCount: this.localCache.size,
      usedBibNumbers: this.bibMapping.size,
      nextAvailableBib: this.getNextBibNumber()
    };
  }

  /**
   * Sync with cloud (placeholder for subscription feature)
   */
  async syncWithCloud(options = {}) {
    if (!options.isSubscribed) {
      return { success: false, error: 'Cloud sync requires subscription' };
    }
    
    if (!options.isOnline) {
      return { success: false, error: 'No internet connection' };
    }
    
    // TODO: Implement cloud sync
    console.log('Cloud sync initiated...');
    
    return { success: true, synced: 0 };
  }
}

module.exports = RacerDatabase;