/**
 * Audio Processing Utilities for Vapi-Exotel Bridge
 * Handles format conversion between:
 * - Vapi: 16kHz PCM 16-bit signed little-endian (raw binary)
 * - Exotel: 8kHz PCM 16-bit signed little-endian (base64 encoded)
 */

export class AudioProcessor {
  constructor() {
    this.VAPI_SAMPLE_RATE = 16000;
    this.EXOTEL_SAMPLE_RATE = 8000;
    this.CHUNK_SIZE_MULTIPLE = 320; // Exotel requirement
    this.MIN_CHUNK_SIZE = 3200; // 100ms at 8kHz
    this.MAX_CHUNK_SIZE = 100000;
  }

  /**
   * Convert Vapi audio (16kHz PCM) to Exotel format (8kHz PCM base64)
   * @param {ArrayBuffer} vapiAudioBuffer - Raw PCM data from Vapi
   * @returns {string} Base64 encoded 8kHz PCM data for Exotel
   */
  vapiToExotel(vapiAudioBuffer) {
    try {
      // Convert ArrayBuffer to Int16Array (16-bit PCM)
      const vapiSamples = new Int16Array(vapiAudioBuffer);
      
      // Downsample from 16kHz to 8kHz (simple decimation - take every 2nd sample)
      const exotelSamples = new Int16Array(Math.floor(vapiSamples.length / 2));
      for (let i = 0; i < exotelSamples.length; i++) {
        exotelSamples[i] = vapiSamples[i * 2];
      }

      // Ensure chunk size meets Exotel requirements
      const adjustedSamples = this.adjustChunkSize(exotelSamples);
      
      // Convert back to ArrayBuffer
      const buffer = adjustedSamples.buffer.slice(
        adjustedSamples.byteOffset,
        adjustedSamples.byteOffset + adjustedSamples.byteLength
      );

      // Encode to base64
      return Buffer.from(buffer).toString('base64');
    } catch (error) {
      console.error('Error converting Vapi to Exotel audio:', error);
      throw error;
    }
  }

  /**
   * Convert Exotel audio (8kHz PCM base64) to Vapi format (16kHz PCM raw)
   * @param {string} exotelBase64Audio - Base64 encoded 8kHz PCM from Exotel
   * @returns {ArrayBuffer} Raw PCM data for Vapi
   */
  exotelToVapi(exotelBase64Audio) {
    try {
      // Decode from base64
      const buffer = Buffer.from(exotelBase64Audio, 'base64');
      const exotelSamples = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);
      
      // Upsample from 8kHz to 16kHz (simple duplication)
      const vapiSamples = new Int16Array(exotelSamples.length * 2);
      for (let i = 0; i < exotelSamples.length; i++) {
        vapiSamples[i * 2] = exotelSamples[i];
        vapiSamples[i * 2 + 1] = exotelSamples[i]; // Duplicate sample
      }

      return vapiSamples.buffer.slice(
        vapiSamples.byteOffset,
        vapiSamples.byteOffset + vapiSamples.byteLength
      );
    } catch (error) {
      console.error('Error converting Exotel to Vapi audio:', error);
      throw error;
    }
  }

  /**
   * Adjust chunk size to meet Exotel requirements
   * @param {Int16Array} samples - Audio samples
   * @returns {Int16Array} Adjusted samples
   */
  adjustChunkSize(samples) {
    const bytesPerSample = 2; // 16-bit = 2 bytes
    const currentBytes = samples.length * bytesPerSample;
    
    // Calculate target size that meets requirements
    let targetSamples = samples.length;
    
    // Ensure minimum chunk size
    const minSamples = this.MIN_CHUNK_SIZE / bytesPerSample;
    if (samples.length < minSamples) {
      // Pad with silence
      targetSamples = minSamples;
    }
    
    // Ensure multiple of 320 bytes (160 samples)
    const samplesPerChunk = this.CHUNK_SIZE_MULTIPLE / bytesPerSample;
    targetSamples = Math.ceil(targetSamples / samplesPerChunk) * samplesPerChunk;
    
    // Ensure maximum chunk size
    const maxSamples = this.MAX_CHUNK_SIZE / bytesPerSample;
    if (targetSamples > maxSamples) {
      targetSamples = maxSamples;
    }

    if (targetSamples === samples.length) {
      return samples;
    }

    // Create adjusted buffer
    const adjustedSamples = new Int16Array(targetSamples);
    
    if (targetSamples > samples.length) {
      // Pad with original data + silence
      adjustedSamples.set(samples, 0);
      // Remaining positions are already 0 (silence)
    } else {
      // Truncate
      adjustedSamples.set(samples.subarray(0, targetSamples), 0);
    }

    return adjustedSamples;
  }

  /**
   * Split large audio chunks into smaller ones for Exotel
   * @param {ArrayBuffer} audioBuffer - Audio data to split
   * @returns {ArrayBuffer[]} Array of smaller chunks
   */
  splitAudioChunks(audioBuffer) {
    const samples = new Int16Array(audioBuffer);
    const maxSamples = this.MAX_CHUNK_SIZE / 2; // 2 bytes per sample
    const chunks = [];

    for (let i = 0; i < samples.length; i += maxSamples) {
      const chunkSamples = samples.slice(i, Math.min(i + maxSamples, samples.length));
      const adjustedChunk = this.adjustChunkSize(chunkSamples);
      chunks.push(adjustedChunk.buffer.slice(
        adjustedChunk.byteOffset,
        adjustedChunk.byteOffset + adjustedChunk.byteLength
      ));
    }

    return chunks;
  }

  /**
   * Validate audio chunk size for Exotel requirements
   * @param {number} sizeInBytes - Chunk size in bytes
   * @returns {boolean} Whether the chunk size is valid
   */
  isValidChunkSize(sizeInBytes) {
    return (
      sizeInBytes >= this.MIN_CHUNK_SIZE &&
      sizeInBytes <= this.MAX_CHUNK_SIZE &&
      sizeInBytes % this.CHUNK_SIZE_MULTIPLE === 0
    );
  }

  /**
   * Get audio chunk duration in milliseconds
   * @param {number} sizeInBytes - Chunk size in bytes
   * @param {number} sampleRate - Sample rate in Hz
   * @returns {number} Duration in milliseconds
   */
  getChunkDuration(sizeInBytes, sampleRate) {
    const samples = sizeInBytes / 2; // 16-bit = 2 bytes per sample
    return (samples / sampleRate) * 1000;
  }
} 