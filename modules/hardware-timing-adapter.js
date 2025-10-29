// modules/hardware-timing-adapter.js
// Adapter for hardware timing devices (Alge Timy3, microgate, etc.)

const EventEmitter = require('events');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

/**
 * Hardware Timing Adapter
 * Handles communication with timing devices and converts their signals
 * into standardized timing events for the race-timing module
 */
class HardwareTimingAdapter extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.deviceType = options.deviceType || 'alge-timy3'; // 'alge-timy3', 'microgate', 'tag-heuer', etc.
    this.port = null;
    this.parser = null;
    this.connected = false;
    
    // Configuration
    this.config = {
      baudRate: options.baudRate || 9600,
      dataBits: options.dataBits || 8,
      stopBits: options.stopBits || 1,
      parity: options.parity || 'none',
      autoReconnect: options.autoReconnect !== false,
      ...options
    };
    
    // Channel mapping (which physical channel corresponds to which course)
    this.channelMapping = options.channelMapping || {
      'C1': 'left',   // Channel 1 = Left/Course A start
      'C2': 'left',   // Channel 2 = Left/Course A finish
      'C3': 'right',  // Channel 3 = Right/Course B start
      'C4': 'right'   // Channel 4 = Right/Course B finish
    };
    
    // Impulse buffer for matching starts with finishes
    this.impulseBuffer = [];
    this.maxBufferAge = 300000; // 5 minutes max age for buffered impulses
  }

  /**
   * List available serial ports
   */
  async listPorts() {
    try {
      const ports = await SerialPort.list();
      return ports.map(port => ({
        path: port.path,
        manufacturer: port.manufacturer,
        serialNumber: port.serialNumber,
        vendorId: port.vendorId,
        productId: port.productId
      }));
    } catch (err) {
      console.error('Error listing ports:', err);
      throw err;
    }
  }

  /**
   * Connect to timing device
   */
  async connect(portPath) {
    if (this.connected) {
      console.log('Already connected to timing device');
      return;
    }

    try {
      this.port = new SerialPort({
        path: portPath,
        baudRate: this.config.baudRate,
        dataBits: this.config.dataBits,
        stopBits: this.config.stopBits,
        parity: this.config.parity
      });

      // Create parser for line-based protocols (most timing devices use this)
      this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

      // Handle incoming data
      this.parser.on('data', (data) => {
        this.handleIncomingData(data);
      });

      // Handle connection events
      this.port.on('open', () => {
        this.connected = true;
        console.log('Connected to timing device:', portPath);
        this.emit('connected', { port: portPath, deviceType: this.deviceType });
      });

      this.port.on('close', () => {
        this.connected = false;
        console.log('Disconnected from timing device');
        this.emit('disconnected');
        
        if (this.config.autoReconnect) {
          setTimeout(() => this.connect(portPath), 5000);
        }
      });

      this.port.on('error', (err) => {
        console.error('Serial port error:', err);
        this.emit('error', err);
      });

    } catch (err) {
      console.error('Failed to connect to timing device:', err);
      throw err;
    }
  }

  /**
   * Disconnect from timing device
   */
  async disconnect() {
    if (!this.connected || !this.port) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.config.autoReconnect = false; // Disable auto-reconnect
      this.port.close((err) => {
        if (err) {
          console.error('Error closing port:', err);
          reject(err);
        } else {
          this.connected = false;
          console.log('Timing device disconnected');
          resolve();
        }
      });
    });
  }

  /**
   * Handle incoming data from timing device
   */
  handleIncomingData(rawData) {
    const data = rawData.toString().trim();
    console.log('Received from timing device:', data);

    // Parse based on device type
    let impulse;
    
    switch (this.deviceType) {
      case 'alge-timy3':
        impulse = this.parseAlgeTimy3(data);
        break;
      case 'microgate':
        impulse = this.parseMicrogate(data);
        break;
      case 'tag-heuer':
        impulse = this.parseTagHeuer(data);
        break;
      default:
        console.warn('Unknown device type:', this.deviceType);
        return;
    }

    if (impulse) {
      this.processImpulse(impulse);
    }
  }

  /**
   * Parse Alge Timy3 protocol
   * Example: "C1 12:34:56.789" (Channel 1, time 12:34:56.789)
   */
  parseAlgeTimy3(data) {
    // Alge Timy3 format: Channel + Time
    const match = data.match(/C(\d+)\s+(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
    
    if (!match) {
      console.warn('Could not parse Alge Timy3 data:', data);
      return null;
    }

    const [, channel, hours, minutes, seconds, milliseconds] = match;
    
    // Convert to absolute timestamp (ms since midnight)
    const timeOfDay = 
      (parseInt(hours) * 3600000) +
      (parseInt(minutes) * 60000) +
      (parseInt(seconds) * 1000) +
      parseInt(milliseconds);

    return {
      channel: `C${channel}`,
      timeOfDay: timeOfDay,
      timestamp: Date.now(), // Fallback to system time
      rawData: data,
      precision: 3 // milliseconds
    };
  }

  /**
   * Parse Microgate protocol
   */
  parseMicrogate(data) {
    // TODO: Implement Microgate protocol parsing
    // Placeholder for now
    console.log('Microgate parsing not yet implemented');
    return null;
  }

  /**
   * Parse Tag Heuer protocol
   */
  parseTagHeuer(data) {
    // TODO: Implement Tag Heuer protocol parsing
    // Placeholder for now
    console.log('Tag Heuer parsing not yet implemented');
    return null;
  }

  /**
   * Process a timing impulse
   */
  processImpulse(impulse) {
    // Clean old impulses from buffer
    this.cleanImpulseBuffer();

    // Add to buffer
    this.impulseBuffer.push({
      ...impulse,
      receivedAt: Date.now()
    });

    // Determine which course this impulse is for
    const course = this.channelMapping[impulse.channel];
    
    if (!course) {
      console.warn('No course mapping for channel:', impulse.channel);
      return;
    }

    // Determine if this is a start or finish impulse
    // Convention: Odd channels (C1, C3) = start, Even channels (C2, C4) = finish
    const channelNum = parseInt(impulse.channel.replace('C', ''));
    const isStart = channelNum % 2 === 1;

    if (isStart) {
      this.emit('start-impulse', {
        course: course,
        timestamp: impulse.timestamp,
        timeOfDay: impulse.timeOfDay,
        precision: impulse.precision,
        channel: impulse.channel
      });
    } else {
      this.emit('finish-impulse', {
        course: course,
        timestamp: impulse.timestamp,
        timeOfDay: impulse.timeOfDay,
        precision: impulse.precision,
        channel: impulse.channel
      });
    }

    // Emit raw impulse for logging/debugging
    this.emit('impulse', impulse);
  }

  /**
   * Clean old impulses from buffer
   */
  cleanImpulseBuffer() {
    const now = Date.now();
    this.impulseBuffer = this.impulseBuffer.filter(
      imp => (now - imp.receivedAt) < this.maxBufferAge
    );
  }

  /**
   * Get impulse history for debugging
   */
  getImpulseHistory(limit = 100) {
    return this.impulseBuffer.slice(-limit);
  }

  /**
   * Send command to timing device
   */
  async sendCommand(command) {
    if (!this.connected || !this.port) {
      throw new Error('Not connected to timing device');
    }

    return new Promise((resolve, reject) => {
      this.port.write(command + '\r\n', (err) => {
        if (err) {
          console.error('Error sending command:', err);
          reject(err);
        } else {
          console.log('Sent command to timing device:', command);
          resolve();
        }
      });
    });
  }

  /**
   * Test the connection by requesting device info
   */
  async testConnection() {
    try {
      // Most timing devices respond to a status request
      await this.sendCommand('?'); // Common status query
      return true;
    } catch (err) {
      console.error('Connection test failed:', err);
      return false;
    }
  }

  /**
   * Get adapter status
   */
  getStatus() {
    return {
      connected: this.connected,
      deviceType: this.deviceType,
      port: this.port?.path || null,
      impulseBufferSize: this.impulseBuffer.length,
      config: this.config,
      channelMapping: this.channelMapping
    };
  }
}

module.exports = HardwareTimingAdapter;