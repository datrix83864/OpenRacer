// modules/hardware.js
// Serial hardware integration: timing gate (USB-CDC) and scoreboard output

const EventEmitter = require('events');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

// Actions a gate port can emit when triggered
const GATE_ACTIONS = Object.freeze({
  START_LEFT:   'start-left',
  FINISH_LEFT:  'finish-left',
  START_RIGHT:  'start-right',
  FINISH_RIGHT: 'finish-right',
  // Alternates start→finish→start… on successive triggers
  TOGGLE_LEFT:  'toggle-left',
  TOGGLE_RIGHT: 'toggle-right',
});

class HardwareManager extends EventEmitter {
  constructor(options = {}) {
    super();

    this.gatePath         = options.gatePath         || null;
    this.gateBaud         = options.gateBaud         || 9600;
    this.gateAction       = options.gateAction       || GATE_ACTIONS.START_LEFT;
    this.gateTriggerByte  = options.gateTriggerByte  || null; // null = any data

    this.scoreboardPath   = options.scoreboardPath   || null;
    this.scoreboardBaud   = options.scoreboardBaud   || 9600;
    this.scoreboardFormat = options.scoreboardFormat || 'text';

    this._gatePort       = null;
    this._gateParser     = null;
    this._scoreboardPort = null;

    this._toggleState = { left: 'start', right: 'start' };
  }

  // ── Port enumeration ─────────────────────────────────────────────────────────

  static async listPorts() {
    try {
      const ports = await SerialPort.list();
      return ports.map(p => ({
        path:         p.path,
        manufacturer: p.manufacturer  || null,
        serialNumber: p.serialNumber  || null,
        vendorId:     p.vendorId      || null,
        productId:    p.productId     || null,
        friendlyName: p.friendlyName  || p.path,
      }));
    } catch (err) {
      console.error('Failed to list serial ports:', err);
      return [];
    }
  }

  // ── Gate port (timing gate input — USB-CDC serial) ────────────────────────────

  async openGatePort(portPath, baudRate = 9600, action = GATE_ACTIONS.START_LEFT) {
    await this.closeGatePort();

    this.gatePath   = portPath;
    this.gateBaud   = baudRate;
    this.gateAction = action;

    return new Promise((resolve, reject) => {
      this._gatePort = new SerialPort({ path: portPath, baudRate, autoOpen: false });

      this._gatePort.open((err) => {
        if (err) {
          this._gatePort = null;
          return reject(new Error(`Gate port open failed: ${err.message}`));
        }

        this._gateParser = this._gatePort.pipe(new ReadlineParser({ delimiter: '\n' }));
        this._gateParser.on('data', (line) => this._handleGateTrigger(line.trim()));

        this._gatePort.on('error', (err) => {
          console.error('Gate port error:', err.message);
          this.emit('gate-error', { message: err.message });
        });

        this._gatePort.on('close', () => this.emit('gate-disconnected'));

        this.emit('gate-connected', { path: portPath, baudRate });
        resolve({ success: true, path: portPath });
      });
    });
  }

  async closeGatePort() {
    if (!this._gatePort) return;
    return new Promise((resolve) => {
      this._gatePort.close(() => {
        this._gatePort   = null;
        this._gateParser = null;
        resolve();
      });
    });
  }

  get gateConnected() {
    return !!(this._gatePort && this._gatePort.isOpen);
  }

  _handleGateTrigger(line) {
    const ts = Date.now();

    // If a specific trigger value is configured, filter out everything else
    if (this.gateTriggerByte !== null && line !== String(this.gateTriggerByte)) return;

    const action = this.gateAction;

    if (action === GATE_ACTIONS.TOGGLE_LEFT || action === GATE_ACTIONS.TOGGLE_RIGHT) {
      const course = action === GATE_ACTIONS.TOGGLE_LEFT ? 'left' : 'right';
      const state  = this._toggleState[course];
      const emit   = state === 'start' ? 'start' : 'finish';
      this._toggleState[course] = state === 'start' ? 'finish' : 'start';
      this.emit('gate-trigger', { action: emit, course, timestamp: ts, raw: line });
    } else {
      const [act, course] = action.split('-');
      this.emit('gate-trigger', { action: act, course, timestamp: ts, raw: line });
    }
  }

  // ── Scoreboard port (serial output) ──────────────────────────────────────────

  async openScoreboardPort(portPath, baudRate = 9600) {
    await this.closeScoreboardPort();

    this.scoreboardPath = portPath;
    this.scoreboardBaud = baudRate;

    return new Promise((resolve, reject) => {
      this._scoreboardPort = new SerialPort({ path: portPath, baudRate, autoOpen: false });

      this._scoreboardPort.open((err) => {
        if (err) {
          this._scoreboardPort = null;
          return reject(new Error(`Scoreboard port open failed: ${err.message}`));
        }

        this._scoreboardPort.on('error', (err) => {
          console.error('Scoreboard port error:', err.message);
          this.emit('scoreboard-error', { message: err.message });
        });

        this._scoreboardPort.on('close', () => this.emit('scoreboard-disconnected'));

        this.emit('scoreboard-connected', { path: portPath, baudRate });
        resolve({ success: true, path: portPath });
      });
    });
  }

  async closeScoreboardPort() {
    if (!this._scoreboardPort) return;
    return new Promise((resolve) => {
      this._scoreboardPort.close(() => {
        this._scoreboardPort = null;
        resolve();
      });
    });
  }

  get scoreboardConnected() {
    return !!(this._scoreboardPort && this._scoreboardPort.isOpen);
  }

  // ── Scoreboard formatting and output ─────────────────────────────────────────

  async sendLeaderboard(leaderboardData, courseName = '') {
    if (!this.scoreboardConnected) return { error: 'Scoreboard not connected' };
    return this._write(this._formatLeaderboard(leaderboardData, courseName));
  }

  async sendRunResult(run, rank) {
    if (!this.scoreboardConnected) return { error: 'Scoreboard not connected' };
    return this._write(this._formatRun(run, rank));
  }

  async sendRaw(text) {
    if (!this.scoreboardConnected) return { error: 'Scoreboard not connected' };
    return this._write(text);
  }

  _write(data) {
    return new Promise((resolve, reject) => {
      this._scoreboardPort.write(data, (err) => {
        if (err) return reject(new Error(`Scoreboard write failed: ${err.message}`));
        this._scoreboardPort.drain(() => resolve({ success: true }));
      });
    });
  }

  _formatLeaderboard(entries, courseName) {
    const W = 32;
    let out = '\x0C'; // form-feed / clear screen
    out += this._center(courseName || 'RESULTS', W) + '\r\n';
    out += '-'.repeat(W) + '\r\n';

    for (const e of entries.slice(0, 10)) {
      const rank = String(e.rank || '').padStart(2);
      const bib  = String(e.bibNumber || '').padStart(4);
      const name = (e.metadata?.racerName || '').substring(0, 13).padEnd(13);
      const time = e.adjustedTime != null
        ? this._fmtTime(e.adjustedTime).padStart(8)
        : '     DNF';
      out += `${rank} ${bib} ${name} ${time}\r\n`;
    }

    out += '-'.repeat(W) + '\r\n';
    return out;
  }

  _formatRun(run, rank) {
    const r    = rank != null ? String(rank).padStart(2) : '--';
    const bib  = String(run.bibNumber || '').padStart(4);
    const name = (run.metadata?.racerName || '').substring(0, 13).padEnd(13);
    const time = run.adjustedTime != null
      ? this._fmtTime(run.adjustedTime).padStart(8)
      : '     DNF';
    return `${r} ${bib} ${name} ${time}\r\n`;
  }

  _fmtTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0
      ? `${mins}:${secs.toFixed(3).padStart(6, '0')}`
      : `${secs.toFixed(3)}s`;
  }

  _center(str, width) {
    const pad = Math.max(0, Math.floor((width - str.length) / 2));
    return ' '.repeat(pad) + str;
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────────

  async closeAll() {
    await Promise.all([this.closeGatePort(), this.closeScoreboardPort()]);
  }
}

HardwareManager.GATE_ACTIONS = GATE_ACTIONS;
module.exports = HardwareManager;
