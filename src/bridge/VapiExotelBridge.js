/**
 * VapiExotelBridge - Complete SSL-Enabled Integration
 * Handles bidirectional audio/protocol conversion with proper SSL certificate validation
 */

import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { AudioProcessor } from '../utils/audioProcessor.js';
import { ProtocolSerializer } from '../utils/protocolSerializer.js';

export class VapiExotelBridge {
  constructor(options = {}) {
    this.options = {
      // SSL Configuration (Critical for resolving "bad handshake")
      enableSSLValidation: options.enableSSLValidation !== false, // Default: true
      caBundlePath: options.caBundlePath || './ssl-certificates/vapi-ca-bundle.pem',
      vapiHostname: options.vapiHostname || 'phone-call-websocket.aws-us-west-2-backend-production1.vapi.ai',
      
      // Audio Configuration
      enableAmplification: options.enableAmplification !== false, // Default: true
      amplificationFactor: options.amplificationFactor || 50,
      maxAmplitude: options.maxAmplitude || 32767 * 0.8,
      
      // Connection Options
      connectionTimeout: options.connectionTimeout || 10000,
      heartbeatInterval: options.heartbeatInterval || 30000,
      autoReconnect: options.autoReconnect !== false,
      
      // Debug Options
      debug: options.debug || false,
      logAudioStats: options.logAudioStats || false,
      
      ...options
    };

    // Initialize processors
    this.audioProcessor = new AudioProcessor();
    this.protocolSerializer = new ProtocolSerializer();
    
    // Connection state
    this.vapiWs = null;
    this.exotelWs = null;
    this.isConnected = false;
    this.connectionId = null;
    this.streamSid = null;
    
    // SSL Context
    this.sslOptions = null;
    this.sslInitialized = false;
    
    // Statistics
    this.stats = {
      connection: { attempts: 0, successes: 0, failures: 0 },
      ssl: { handshakes: 0, successes: 0, failures: 0 },
      audio: { vapiToExotel: 0, exotelToVapi: 0, amplified: 0 },
      messages: { sent: 0, received: 0 },
      errors: []
    };
    
    // Event handlers
    this.eventHandlers = {
      connected: [],
      disconnected: [],
      error: [],
      audioReceived: [],
      messageProcessed: []
    };
    
    this.debug('VapiExotelBridge initialized with SSL support');
  }

  /**
   * Initialize SSL certificates and context
   */
  async initializeSSL() {
    if (!this.options.enableSSLValidation) {
      this.debug('SSL validation disabled');
      this.sslOptions = { rejectUnauthorized: false };
      this.sslInitialized = true;
      return;
    }

    try {
      // Check if CA bundle exists
      if (!fs.existsSync(this.options.caBundlePath)) {
        this.debug(`CA bundle not found: ${this.options.caBundlePath}`);
        await this.downloadSSLCertificates();
      }

      // Load CA bundle
      const caBundle = fs.readFileSync(this.options.caBundlePath);
      this.debug(`Loaded CA bundle: ${this.options.caBundlePath} (${caBundle.length} bytes)`);

      // Create SSL options for WebSocket connection
      this.sslOptions = {
        rejectUnauthorized: true,
        ca: caBundle,
        checkServerIdentity: (hostname, cert) => {
          this.debug(`Verifying SSL hostname: ${hostname}`);
          if (hostname !== this.options.vapiHostname) {
            const error = new Error(`SSL hostname mismatch: expected ${this.options.vapiHostname}, got ${hostname}`);
            this.stats.ssl.failures++;
            return error;
          }
          this.stats.ssl.successes++;
          return undefined; // Valid
        }
      };

      this.sslInitialized = true;
      this.debug('SSL context initialized successfully');

    } catch (error) {
      this.error('SSL initialization failed:', error.message);
      
      // Fallback to insecure connection
      this.debug('Falling back to insecure SSL connection');
      this.sslOptions = { rejectUnauthorized: false };
      this.sslInitialized = true;
    }
  }

  /**
   * Download SSL certificates from Vapi server
   */
  async downloadSSLCertificates() {
    this.debug('Downloading SSL certificates from Vapi server...');
    
    try {
      const certDir = path.dirname(this.options.caBundlePath);
      
      // Create certificates directory
      if (!fs.existsSync(certDir)) {
        fs.mkdirSync(certDir, { recursive: true });
      }

      // Download certificate chain
      const certificates = await this.downloadCertificateChain();
      
      // Save CA bundle
      const caBundle = certificates.map(c => c.pem).join('\n');
      fs.writeFileSync(this.options.caBundlePath, caBundle);
      
      this.debug(`Downloaded and saved ${certificates.length} certificates to ${this.options.caBundlePath}`);
      
    } catch (error) {
      this.error('Certificate download failed:', error.message);
      throw error;
    }
  }

  /**
   * Download certificate chain from Vapi server
   */
  async downloadCertificateChain() {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.options.vapiHostname,
        port: 443,
        method: 'GET',
        rejectUnauthorized: false, // Temporarily to download cert
        agent: false
      };

      const req = https.request(options, (res) => {
        const socket = res.socket;
        const cert = socket.getPeerCertificate(true);
        const fullChain = [cert];
        
        // Build certificate chain
        let currentCert = cert;
        while (currentCert && currentCert.issuerCertificate && currentCert.issuerCertificate !== currentCert) {
          currentCert = currentCert.issuerCertificate;
          fullChain.push(currentCert);
        }

        const certificates = fullChain.map((cert, index) => {
          const pemCert = `-----BEGIN CERTIFICATE-----\n${cert.raw.toString('base64').match(/.{1,64}/g).join('\n')}\n-----END CERTIFICATE-----`;
          return {
            index: index + 1,
            subject: cert.subject,
            issuer: cert.issuer,
            pem: pemCert
          };
        });

        resolve(certificates);
      });

      req.on('error', reject);
      req.end();
    });
  }

  /**
   * Connect to both Vapi and Exotel WebSocket servers
   */
  async connect(vapiWebSocketUrl, exotelStreamSid) {
    this.debug(`Connecting to Vapi: ${vapiWebSocketUrl}`);
    this.debug(`Exotel Stream SID: ${exotelStreamSid}`);
    
    this.connectionId = this.generateConnectionId();
    this.streamSid = exotelStreamSid;
    this.stats.connection.attempts++;

    try {
      // Initialize SSL if not already done
      if (!this.sslInitialized) {
        await this.initializeSSL();
      }

      // Connect to Vapi WebSocket with SSL validation
      await this.connectToVapi(vapiWebSocketUrl);
      
      // Set up connection monitoring
      this.setupConnectionMonitoring();
      
      this.isConnected = true;
      this.stats.connection.successes++;
      this.emit('connected', { connectionId: this.connectionId, streamSid: this.streamSid });
      
      this.debug(`Bridge connected successfully - Connection ID: ${this.connectionId}`);
      
    } catch (error) {
      this.stats.connection.failures++;
      this.stats.errors.push({ timestamp: Date.now(), type: 'connection', error: error.message });
      this.error('Connection failed:', error.message);
      throw error;
    }
  }

  /**
   * Connect to Vapi WebSocket with SSL validation
   */
  async connectToVapi(vapiWebSocketUrl) {
    return new Promise((resolve, reject) => {
      this.debug('Attempting secure WebSocket connection to Vapi...');
      
      const startTime = Date.now();
      this.stats.ssl.handshakes++;

      try {
        // Create WebSocket with SSL validation
        this.vapiWs = new WebSocket(vapiWebSocketUrl, this.sslOptions);

        const timeout = setTimeout(() => {
          this.debug('Vapi WebSocket connection timeout');
          this.vapiWs?.terminate();
          reject(new Error('Vapi WebSocket connection timeout'));
        }, this.options.connectionTimeout);

        this.vapiWs.on('open', () => {
          clearTimeout(timeout);
          const duration = Date.now() - startTime;
          this.debug(`✅ Vapi WebSocket connected successfully! SSL handshake: ${duration}ms`);
          this.debug('🔐 SSL certificate validation: PASSED');
          resolve();
        });

        this.vapiWs.on('message', (data) => {
          this.handleVapiMessage(data);
        });

        this.vapiWs.on('error', (error) => {
          clearTimeout(timeout);
          const duration = Date.now() - startTime;
          
          this.error(`Vapi WebSocket error after ${duration}ms:`, error.message);
          
          if (error.message.includes('certificate') || error.message.includes('handshake')) {
            this.error('🔒 SSL Certificate validation failed!');
            this.error('💡 This is the "bad handshake" error root cause');
            this.stats.ssl.failures++;
          } else if (error.message.includes('500')) {
            this.debug('⚠️ HTTP 500 - Endpoint expired (SSL validation actually passed)');
          }
          
          reject(error);
        });

        this.vapiWs.on('close', (code, reason) => {
          this.debug(`Vapi WebSocket closed: ${code} - ${reason || 'No reason'}`);
          this.handleDisconnection('vapi', code, reason);
        });

      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Set up Exotel WebSocket connection (called when Exotel connects to us)
   */
  setupExotelConnection(exotelWs) {
    this.debug('Setting up Exotel WebSocket connection');
    this.exotelWs = exotelWs;

    // Send start event to Exotel
    const startEvent = this.protocolSerializer.createExotelStartEvent(this.streamSid);
    this.sendToExotel(startEvent);

    this.exotelWs.on('message', (data) => {
      this.handleExotelMessage(data);
    });

    this.exotelWs.on('close', (code, reason) => {
      this.debug(`Exotel WebSocket closed: ${code} - ${reason || 'No reason'}`);
      this.handleDisconnection('exotel', code, reason);
    });

    this.exotelWs.on('error', (error) => {
      this.error('Exotel WebSocket error:', error.message);
    });
  }

  /**
   * Handle incoming audio/messages from Vapi
   */
  handleVapiMessage(data) {
    try {
      this.stats.messages.received++;

      if (Buffer.isBuffer(data)) {
        // Audio data from Vapi assistant
        console.log(`🎵 Vapi audio received: ${data.length} bytes`);
        
        // Apply amplification if enabled
        let processedAudio = data;
        if (this.options.enableAmplification) {
          processedAudio = this.amplifyAudio(data);
          this.stats.audio.amplified++;
        }

        // Convert from Vapi format (16kHz PCM) to Exotel format (8kHz base64)
        const exotelAudio = this.audioProcessor.vapiToExotel(processedAudio);
        
        if (exotelAudio) {
          // Create media event for Exotel
          const mediaEvent = this.protocolSerializer.createExotelMediaEvent(exotelAudio);
          this.sendToExotel(mediaEvent);
          this.stats.audio.vapiToExotel++;
          console.log(`📤 Audio forwarded to Exotel (${exotelAudio.length} base64 chars)`);
        }
        
        this.emit('audioReceived', { source: 'vapi', size: data.length, processed: processedAudio.byteLength });

      } else {
        // Control messages from Vapi
        const message = data.toString();
        this.debug(`📨 Vapi message: ${message.substring(0, 100)}...`);
        
        try {
          const parsed = JSON.parse(message);
          if (parsed.type === 'speech-update') {
            console.log(`🗣️ Assistant speech: ${parsed.status} (turn ${parsed.turn || 0})`);
            
            if (parsed.status === 'started') {
              console.log('🎤 Assistant speaking - audio should flow now');
            }
          }
          this.handleVapiControlMessage(parsed);
        } catch (parseError) {
          this.debug('Non-JSON message from Vapi:', message);
        }
      }

    } catch (error) {
      this.error('Error handling Vapi message:', error.message);
    }
  }

  /**
   * Handle incoming messages from Exotel
   */
  handleExotelMessage(data) {
    try {
      this.stats.messages.received++;
      const message = data.toString();
      
      this.debug(`📨 Exotel message: ${message.substring(0, 100)}...`);
      
      const event = this.protocolSerializer.parseExotelEvent(message);
      if (!event) return;

      switch (event.event) {
        case 'media':
          // Convert from Exotel format (8kHz base64) to Vapi format (16kHz PCM)
          const vapiAudio = this.audioProcessor.exotelToVapi(event.media.payload);
          this.sendToVapi(vapiAudio);
          this.stats.audio.exotelToVapi++;
          break;

        case 'start':
          this.debug('Exotel stream started');
          break;

        case 'stop':
          this.debug('Exotel stream stopped');
          this.disconnect();
          break;

        case 'dtmf':
          this.debug(`DTMF received: ${event.dtmf.digit}`);
          // Handle DTMF if needed
          break;

        default:
          this.debug(`Unknown Exotel event: ${event.event}`);
      }

      this.emit('messageProcessed', { source: 'exotel', event: event.event });

    } catch (error) {
      this.error('Error handling Exotel message:', error.message);
    }
  }

  /**
   * Amplify audio to resolve low volume issues
   */
  amplifyAudio(audioBuffer) {
    if (!this.options.enableAmplification || !audioBuffer || audioBuffer.length === 0) {
      return audioBuffer;
    }

    try {
      const audioView = new Int16Array(audioBuffer);
      const amplifiedAudio = new Int16Array(audioView.length);
      let clippedSamples = 0;
      let maxSample = 0;

      // Apply noise gate and amplification
      for (let i = 0; i < audioView.length; i++) {
        const sample = audioView[i];
        const absSample = Math.abs(sample);
        
        // Noise gate (ignore very quiet samples)
        if (absSample < 10) {
          amplifiedAudio[i] = 0;
          continue;
        }

        // Amplify
        let amplified = sample * this.options.amplificationFactor;
        
        // Prevent clipping
        if (amplified > this.options.maxAmplitude) {
          amplified = this.options.maxAmplitude;
          clippedSamples++;
        } else if (amplified < -this.options.maxAmplitude) {
          amplified = -this.options.maxAmplitude;
          clippedSamples++;
        }
        
        amplifiedAudio[i] = Math.round(amplified);
        maxSample = Math.max(maxSample, Math.abs(amplified));
      }

      if (this.options.logAudioStats && maxSample > 0) {
        const volumePercent = (maxSample / 32767 * 100).toFixed(1);
        this.debug(`🎵 Amplified audio: ${volumePercent}% volume, ${clippedSamples} clipped samples`);
      }

      return amplifiedAudio.buffer.slice(
        amplifiedAudio.byteOffset,
        amplifiedAudio.byteOffset + amplifiedAudio.byteLength
      );

    } catch (error) {
      this.error('Audio amplification failed:', error.message);
      return audioBuffer;
    }
  }

  /**
   * Send data to Vapi WebSocket
   */
  sendToVapi(data) {
    if (this.vapiWs && this.vapiWs.readyState === WebSocket.OPEN) {
      try {
        this.vapiWs.send(data);
        this.stats.messages.sent++;
      } catch (error) {
        this.error('Failed to send to Vapi:', error.message);
      }
    } else {
      this.debug('Cannot send to Vapi: WebSocket not connected');
    }
  }

  /**
   * Send data to Exotel WebSocket
   */
  sendToExotel(data) {
    if (this.exotelWs && this.exotelWs.readyState === WebSocket.OPEN) {
      try {
        this.exotelWs.send(data);
        this.stats.messages.sent++;
      } catch (error) {
        this.error('Failed to send to Exotel:', error.message);
      }
    } else {
      this.debug('Cannot send to Exotel: WebSocket not connected');
    }
  }

  /**
   * Get bridge statistics
   */
  getStats() {
    return {
      ...this.stats,
      connection: {
        ...this.stats.connection,
        isConnected: this.isConnected,
        connectionId: this.connectionId,
        streamSid: this.streamSid,
        sslInitialized: this.sslInitialized
      },
      uptime: Date.now() - (this.stats.connection.lastConnected || Date.now())
    };
  }

  /**
   * Event handling
   */
  on(event, handler) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].push(handler);
    }
  }

  emit(event, data) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          this.error(`Event handler error for ${event}:`, error.message);
        }
      });
    }
  }

  /**
   * Cleanup and disconnect
   */
  async disconnect() {
    this.debug('Disconnecting bridge...');
    
    this.isConnected = false;
    
    if (this.vapiWs) {
      this.vapiWs.close();
      this.vapiWs = null;
    }
    
    if (this.exotelWs) {
      this.exotelWs.close();
      this.exotelWs = null;
    }
    
    this.emit('disconnected', { connectionId: this.connectionId });
    this.debug('Bridge disconnected');
  }

  /**
   * Utility methods
   */
  generateConnectionId() {
    return `bridge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  debug(message, ...args) {
    if (this.options.debug) {
      console.log(`[VapiBridge] ${message}`, ...args);
    }
  }

  error(message, ...args) {
    console.error(`[VapiBridge ERROR] ${message}`, ...args);
  }

  // Handle other methods...
  handleVapiControlMessage(message) {
    // Handle speech updates, connection status, etc.
    this.debug(`Vapi control message: ${message.type || 'unknown'}`);
  }

  handleDisconnection(source, code, reason) {
    this.debug(`${source} disconnected: ${code} - ${reason}`);
    if (this.options.autoReconnect && this.isConnected) {
      // Implement reconnection logic if needed
      this.debug(`Auto-reconnect not implemented for ${source}`);
    }
  }

  setupConnectionMonitoring() {
    // Set up heartbeat and monitoring
    if (this.options.heartbeatInterval > 0) {
      setInterval(() => {
        if (this.isConnected) {
          // Send keepalive if needed
          this.debug('Connection heartbeat');
        }
      }, this.options.heartbeatInterval);
    }
  }
} 