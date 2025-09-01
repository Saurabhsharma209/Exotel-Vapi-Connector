/**
 * Protocol Serializer for Vapi-Exotel Bridge
 * Handles message format conversion between:
 * - Vapi: Binary audio data + simple JSON control messages
 * - Exotel: Structured JSON events (start, media, stop, dtmf, etc.)
 */

export class ProtocolSerializer {
  constructor() {
    this.sequenceNumber = 0;
    this.streamSid = null;
    this.callActive = false;
  }

  /**
   * Create Exotel start event when call begins
   * @param {string} streamSid - Unique stream identifier
   * @param {Object} customParameters - Additional parameters
   * @returns {string} JSON start event for Exotel
   */
  createExotelStartEvent(streamSid, customParameters = {}) {
    this.streamSid = streamSid;
    this.callActive = true;
    this.sequenceNumber = 0;

    const startEvent = {
      event: 'start',
      stream_sid: streamSid,
      start: {
        media_format: {
          encoding: 'raw',
          sample_rate: 8000,
          channels: 1
        },
        custom_parameters: customParameters
      }
    };

    return JSON.stringify(startEvent);
  }

  /**
   * Convert Vapi audio data to Exotel media event
   * @param {string} base64AudioData - Base64 encoded audio from AudioProcessor
   * @returns {string} JSON media event for Exotel
   */
  createExotelMediaEvent(base64AudioData) {
    if (!this.callActive || !this.streamSid) {
      throw new Error('Call not active or stream SID not set');
    }

    const mediaEvent = {
      event: 'media',
      stream_sid: this.streamSid,
      sequence_number: (++this.sequenceNumber).toString(),
      media: {
        payload: base64AudioData
      }
    };

    return JSON.stringify(mediaEvent);
  }

  /**
   * Create Exotel stop event when call ends
   * @returns {string} JSON stop event for Exotel
   */
  createExotelStopEvent() {
    this.callActive = false;

    const stopEvent = {
      event: 'stop',
      stream_sid: this.streamSid,
      stop: {}
    };

    return JSON.stringify(stopEvent);
  }

  /**
   * Create Exotel clear event to clear audio buffer
   * @returns {string} JSON clear event for Exotel
   */
  createExotelClearEvent() {
    if (!this.callActive || !this.streamSid) {
      throw new Error('Call not active or stream SID not set');
    }

    const clearEvent = {
      event: 'clear',
      stream_sid: this.streamSid
    };

    return JSON.stringify(clearEvent);
  }

  /**
   * Parse incoming Exotel event
   * @param {string} jsonData - Raw JSON string from Exotel
   * @returns {Object} Parsed event object
   */
  parseExotelEvent(jsonData) {
    try {
      const event = JSON.parse(jsonData);
      
      // Validate required fields
      if (!event.event) {
        throw new Error('Missing event type in Exotel message');
      }

      return {
        type: event.event,
        streamSid: event.stream_sid,
        sequenceNumber: event.sequence_number,
        data: event,
        isStart: event.event === 'start',
        isMedia: event.event === 'media',
        isStop: event.event === 'stop',
        isDtmf: event.event === 'dtmf',
        isMark: event.event === 'mark'
      };
    } catch (error) {
      console.error('Error parsing Exotel event:', error);
      throw new Error(`Failed to parse Exotel event: ${error.message}`);
    }
  }

  /**
   * Extract audio payload from Exotel media event
   * @param {Object} parsedEvent - Parsed Exotel event
   * @returns {string|null} Base64 encoded audio data or null
   */
  extractAudioPayload(parsedEvent) {
    if (!parsedEvent.isMedia || !parsedEvent.data.media) {
      return null;
    }

    return parsedEvent.data.media.payload;
  }

  /**
   * Create Vapi control message
   * @param {string} type - Message type (e.g., 'hangup')
   * @param {Object} data - Additional data
   * @returns {string} JSON control message for Vapi
   */
  createVapiControlMessage(type, data = {}) {
    const controlMessage = {
      type,
      ...data
    };

    return JSON.stringify(controlMessage);
  }

  /**
   * Parse Vapi control message
   * @param {string} jsonData - Raw JSON string from Vapi
   * @returns {Object} Parsed control message
   */
  parseVapiControlMessage(jsonData) {
    try {
      const message = JSON.parse(jsonData);
      
      return {
        type: message.type,
        data: message,
        isHangup: message.type === 'hangup',
        isStart: message.type === 'start',
        isStop: message.type === 'stop'
      };
    } catch (error) {
      console.error('Error parsing Vapi control message:', error);
      throw new Error(`Failed to parse Vapi control message: ${error.message}`);
    }
  }

  /**
   * Handle DTMF events from Exotel
   * @param {Object} parsedEvent - Parsed DTMF event
   * @returns {Object} DTMF information
   */
  handleDtmfEvent(parsedEvent) {
    if (!parsedEvent.isDtmf) {
      return null;
    }

    return {
      digit: parsedEvent.data.dtmf?.digit,
      streamSid: parsedEvent.streamSid
    };
  }

  /**
   * Create mark event for synchronization
   * @param {string} markName - Name/identifier for the mark
   * @returns {string} JSON mark event
   */
  createExotelMarkEvent(markName) {
    if (!this.callActive || !this.streamSid) {
      throw new Error('Call not active or stream SID not set');
    }

    const markEvent = {
      event: 'mark',
      stream_sid: this.streamSid,
      mark: {
        name: markName
      }
    };

    return JSON.stringify(markEvent);
  }

  /**
   * Reset serializer state (e.g., between calls)
   */
  reset() {
    this.sequenceNumber = 0;
    this.streamSid = null;
    this.callActive = false;
  }

  /**
   * Get current call state
   * @returns {Object} Current state information
   */
  getState() {
    return {
      streamSid: this.streamSid,
      callActive: this.callActive,
      sequenceNumber: this.sequenceNumber
    };
  }

  /**
   * Validate message format for specific protocol
   * @param {string} protocol - 'vapi' or 'exotel'
   * @param {*} message - Message to validate
   * @returns {boolean} Whether message is valid
   */
  validateMessage(protocol, message) {
    try {
      if (protocol === 'vapi') {
        // Vapi messages can be binary (ArrayBuffer/Buffer) or JSON strings
        return message instanceof ArrayBuffer || 
               Buffer.isBuffer(message) || 
               (typeof message === 'string' && this.isValidJson(message));
      } else if (protocol === 'exotel') {
        // Exotel messages are always JSON strings with specific structure
        if (typeof message !== 'string') return false;
        
        const parsed = JSON.parse(message);
        return parsed.event && typeof parsed.event === 'string';
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if string is valid JSON
   * @param {string} str - String to check
   * @returns {boolean} Whether string is valid JSON
   */
  isValidJson(str) {
    try {
      JSON.parse(str);
      return true;
    } catch (error) {
      return false;
    }
  }
} 