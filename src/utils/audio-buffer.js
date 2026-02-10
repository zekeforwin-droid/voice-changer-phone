/**
 * Audio Buffer
 * 
 * Collects audio chunks and buffers them for processing.
 * Handles timing-based buffering for low-latency voice transformation.
 */

export class AudioBuffer {
  /**
   * Create an audio buffer
   * 
   * @param {number} targetMs - Target buffer duration in milliseconds
   * @param {number} sampleRate - Sample rate (default 8000 for Twilio μ-law)
   */
  constructor(targetMs = 200, sampleRate = 8000) {
    this.targetMs = targetMs;
    this.sampleRate = sampleRate;
    this.bytesPerMs = sampleRate / 1000;  // For 8-bit μ-law
    this.targetBytes = Math.ceil(this.targetMs * this.bytesPerMs);
    
    this.chunks = [];
    this.totalBytes = 0;
    this.firstChunkTime = null;
    
    // Adaptive buffering
    this.minMs = Math.max(100, targetMs - 50);
    this.maxMs = targetMs + 100;
  }
  
  /**
   * Add an audio chunk to the buffer
   * 
   * @param {Buffer} chunk - Audio data
   */
  push(chunk) {
    if (this.chunks.length === 0) {
      this.firstChunkTime = Date.now();
    }
    
    this.chunks.push(chunk);
    this.totalBytes += chunk.length;
  }
  
  /**
   * Check if buffer has enough data to process
   * 
   * @returns {boolean}
   */
  isReady() {
    // Check byte count
    if (this.totalBytes >= this.targetBytes) {
      return true;
    }
    
    // Check elapsed time (max wait)
    if (this.firstChunkTime && (Date.now() - this.firstChunkTime) >= this.maxMs) {
      return this.totalBytes > 0;
    }
    
    return false;
  }
  
  /**
   * Get current buffer duration in milliseconds
   */
  getDurationMs() {
    return this.totalBytes / this.bytesPerMs;
  }
  
  /**
   * Flush the buffer and return concatenated audio
   * 
   * @returns {Buffer|null} - Concatenated audio or null if empty
   */
  flush() {
    if (this.chunks.length === 0) {
      return null;
    }
    
    const result = Buffer.concat(this.chunks);
    
    // Reset state
    this.chunks = [];
    this.totalBytes = 0;
    this.firstChunkTime = null;
    
    return result;
  }
  
  /**
   * Get buffer without clearing (peek)
   * 
   * @returns {Buffer|null}
   */
  peek() {
    if (this.chunks.length === 0) {
      return null;
    }
    return Buffer.concat(this.chunks);
  }
  
  /**
   * Clear the buffer
   */
  clear() {
    this.chunks = [];
    this.totalBytes = 0;
    this.firstChunkTime = null;
  }
  
  /**
   * Get buffer statistics
   */
  getStats() {
    return {
      chunks: this.chunks.length,
      bytes: this.totalBytes,
      durationMs: this.getDurationMs(),
      targetMs: this.targetMs,
      ready: this.isReady(),
    };
  }
  
  /**
   * Adjust target buffer size (for adaptive buffering)
   * 
   * @param {number} newTargetMs - New target in milliseconds
   */
  adjustTarget(newTargetMs) {
    this.targetMs = Math.max(this.minMs, Math.min(this.maxMs, newTargetMs));
    this.targetBytes = Math.ceil(this.targetMs * this.bytesPerMs);
  }
}

/**
 * Sliding Window Audio Buffer
 * 
 * Maintains a rolling buffer for overlap-add processing.
 * Useful for smoother voice transformation.
 */
export class SlidingAudioBuffer {
  /**
   * Create a sliding window buffer
   * 
   * @param {number} windowMs - Window size in milliseconds
   * @param {number} hopMs - Hop size (overlap) in milliseconds
   * @param {number} sampleRate - Sample rate
   */
  constructor(windowMs = 200, hopMs = 100, sampleRate = 8000) {
    this.windowMs = windowMs;
    this.hopMs = hopMs;
    this.sampleRate = sampleRate;
    
    this.bytesPerMs = sampleRate / 1000;
    this.windowBytes = Math.ceil(windowMs * this.bytesPerMs);
    this.hopBytes = Math.ceil(hopMs * this.bytesPerMs);
    
    this.buffer = Buffer.alloc(0);
  }
  
  /**
   * Add audio to the buffer
   */
  push(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
  }
  
  /**
   * Check if a window is ready
   */
  isReady() {
    return this.buffer.length >= this.windowBytes;
  }
  
  /**
   * Get the next window and advance by hop size
   * 
   * @returns {Buffer|null}
   */
  getWindow() {
    if (!this.isReady()) {
      return null;
    }
    
    // Extract window
    const window = this.buffer.subarray(0, this.windowBytes);
    
    // Advance by hop size
    this.buffer = this.buffer.subarray(this.hopBytes);
    
    return Buffer.from(window);  // Copy to avoid issues
  }
  
  /**
   * Clear the buffer
   */
  clear() {
    this.buffer = Buffer.alloc(0);
  }
  
  /**
   * Get current buffer size
   */
  getSize() {
    return this.buffer.length;
  }
}

/**
 * Jitter Buffer
 * 
 * Handles network jitter by maintaining a minimum buffer level.
 * Packets are stored with timestamps and played back in order.
 */
export class JitterBuffer {
  /**
   * Create a jitter buffer
   * 
   * @param {number} targetDelayMs - Target delay to absorb jitter
   * @param {number} maxDelayMs - Maximum delay before dropping old packets
   */
  constructor(targetDelayMs = 100, maxDelayMs = 500) {
    this.targetDelayMs = targetDelayMs;
    this.maxDelayMs = maxDelayMs;
    
    this.packets = [];
    this.lastOutputTime = null;
  }
  
  /**
   * Add a packet to the buffer
   * 
   * @param {Buffer} data - Audio data
   * @param {number} timestamp - Packet timestamp
   */
  push(data, timestamp) {
    this.packets.push({ data, timestamp, receivedAt: Date.now() });
    
    // Sort by timestamp
    this.packets.sort((a, b) => a.timestamp - b.timestamp);
    
    // Remove old packets
    const now = Date.now();
    this.packets = this.packets.filter(p => (now - p.receivedAt) < this.maxDelayMs);
  }
  
  /**
   * Get the next packet if delay threshold is met
   * 
   * @returns {Buffer|null}
   */
  pop() {
    if (this.packets.length === 0) {
      return null;
    }
    
    const oldest = this.packets[0];
    const delay = Date.now() - oldest.receivedAt;
    
    if (delay >= this.targetDelayMs) {
      return this.packets.shift().data;
    }
    
    return null;
  }
  
  /**
   * Get buffer statistics
   */
  getStats() {
    return {
      packetCount: this.packets.length,
      oldestDelayMs: this.packets.length > 0 
        ? Date.now() - this.packets[0].receivedAt 
        : 0,
    };
  }
}
