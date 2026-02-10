/**
 * Audio Codec Utilities
 * 
 * Handles μ-law (G.711) ↔ Linear PCM conversion and resampling.
 * Twilio Media Streams use μ-law encoding at 8kHz.
 */

// μ-law decoding table (256 values → 16-bit PCM)
const MULAW_DECODE_TABLE = new Int16Array(256);

// μ-law encoding table (16-bit signed → 8-bit μ-law)
const MULAW_ENCODE_TABLE = new Uint8Array(65536);

// Initialize lookup tables for fast conversion
(function initMulawTables() {
  // Build decode table
  for (let i = 0; i < 256; i++) {
    const mulaw = ~i;  // Complement
    const sign = (mulaw & 0x80) ? -1 : 1;
    const exponent = (mulaw >> 4) & 0x07;
    const mantissa = mulaw & 0x0F;
    
    let magnitude = (mantissa << 3) | 0x84;  // Add bias
    magnitude <<= exponent;
    magnitude -= 0x84;  // Remove bias
    
    MULAW_DECODE_TABLE[i] = sign * magnitude;
  }
  
  // Build encode table
  for (let i = 0; i < 65536; i++) {
    // Convert unsigned table index to signed PCM sample
    const sample = i - 32768;
    MULAW_ENCODE_TABLE[i] = linearToMulaw(sample);
  }
})();

/**
 * Convert a single linear PCM sample to μ-law
 */
function linearToMulaw(sample) {
  const MULAW_MAX = 0x1FFF;  // Maximum magnitude
  const MULAW_BIAS = 33;     // Bias value
  
  let sign = 0;
  
  if (sample < 0) {
    sign = 0x80;
    sample = -sample;
  }
  
  // Clip to max
  if (sample > MULAW_MAX) {
    sample = MULAW_MAX;
  }
  
  // Add bias
  sample += MULAW_BIAS;
  
  // Find exponent
  let exponent = 7;
  let expMask = 0x4000;
  
  while (!(sample & expMask) && exponent > 0) {
    exponent--;
    expMask >>= 1;
  }
  
  // Extract mantissa
  const mantissa = (sample >> (exponent + 3)) & 0x0F;
  
  // Combine and complement
  return ~(sign | (exponent << 4) | mantissa) & 0xFF;
}

/**
 * Decode μ-law buffer to 16-bit PCM
 * 
 * @param {Buffer} mulawBuffer - μ-law encoded audio
 * @returns {Buffer} - PCM audio (16-bit signed, little-endian)
 */
export function mulawDecode(mulawBuffer) {
  const pcmBuffer = Buffer.alloc(mulawBuffer.length * 2);
  
  for (let i = 0; i < mulawBuffer.length; i++) {
    const pcmSample = MULAW_DECODE_TABLE[mulawBuffer[i]];
    pcmBuffer.writeInt16LE(pcmSample, i * 2);
  }
  
  return pcmBuffer;
}

/**
 * Encode 16-bit PCM to μ-law
 * 
 * @param {Buffer} pcmBuffer - PCM audio (16-bit signed, little-endian)
 * @returns {Buffer} - μ-law encoded audio
 */
export function mulawEncode(pcmBuffer) {
  const numSamples = Math.floor(pcmBuffer.length / 2);
  const mulawBuffer = Buffer.alloc(numSamples);
  
  for (let i = 0; i < numSamples; i++) {
    const pcmSample = pcmBuffer.readInt16LE(i * 2);
    // Convert signed to unsigned index
    const tableIndex = pcmSample + 32768;
    mulawBuffer[i] = MULAW_ENCODE_TABLE[tableIndex];
  }
  
  return mulawBuffer;
}

/**
 * Resample audio using linear interpolation
 * 
 * @param {Buffer} pcmBuffer - Input PCM audio (16-bit signed)
 * @param {number} fromRate - Source sample rate
 * @param {number} toRate - Target sample rate
 * @returns {Buffer} - Resampled PCM audio
 */
export function resample(pcmBuffer, fromRate, toRate) {
  if (fromRate === toRate) {
    return pcmBuffer;
  }
  
  const inputSamples = Math.floor(pcmBuffer.length / 2);
  const ratio = fromRate / toRate;
  const outputSamples = Math.floor(inputSamples / ratio);
  const outputBuffer = Buffer.alloc(outputSamples * 2);
  
  for (let i = 0; i < outputSamples; i++) {
    const srcPos = i * ratio;
    const srcIndex = Math.floor(srcPos);
    const frac = srcPos - srcIndex;
    
    // Get samples for interpolation
    const sample1 = pcmBuffer.readInt16LE(Math.min(srcIndex * 2, (inputSamples - 1) * 2));
    const sample2 = srcIndex + 1 < inputSamples
      ? pcmBuffer.readInt16LE((srcIndex + 1) * 2)
      : sample1;
    
    // Linear interpolation
    const interpolated = Math.round(sample1 * (1 - frac) + sample2 * frac);
    
    // Clamp to 16-bit range
    const clamped = Math.max(-32768, Math.min(32767, interpolated));
    outputBuffer.writeInt16LE(clamped, i * 2);
  }
  
  return outputBuffer;
}

/**
 * Normalize audio levels (apply gain and clipping)
 * 
 * @param {Buffer} pcmBuffer - PCM audio
 * @param {number} gain - Gain multiplier (1.0 = no change)
 * @returns {Buffer} - Normalized PCM audio
 */
export function normalizeAudio(pcmBuffer, gain = 1.0) {
  if (gain === 1.0) {
    return pcmBuffer;
  }
  
  const numSamples = Math.floor(pcmBuffer.length / 2);
  const outputBuffer = Buffer.alloc(numSamples * 2);
  
  for (let i = 0; i < numSamples; i++) {
    let sample = pcmBuffer.readInt16LE(i * 2);
    sample = Math.round(sample * gain);
    
    // Clamp to 16-bit range
    sample = Math.max(-32768, Math.min(32767, sample));
    outputBuffer.writeInt16LE(sample, i * 2);
  }
  
  return outputBuffer;
}

/**
 * Calculate RMS (Root Mean Square) of audio buffer
 * Useful for detecting silence
 * 
 * @param {Buffer} pcmBuffer - PCM audio
 * @returns {number} - RMS value (0-32768)
 */
export function calculateRMS(pcmBuffer) {
  const numSamples = Math.floor(pcmBuffer.length / 2);
  if (numSamples === 0) return 0;
  
  let sum = 0;
  for (let i = 0; i < numSamples; i++) {
    const sample = pcmBuffer.readInt16LE(i * 2);
    sum += sample * sample;
  }
  
  return Math.sqrt(sum / numSamples);
}

/**
 * Check if audio is mostly silence
 * 
 * @param {Buffer} pcmBuffer - PCM audio
 * @param {number} threshold - RMS threshold (default 100)
 * @returns {boolean} - True if silence
 */
export function isSilence(pcmBuffer, threshold = 100) {
  return calculateRMS(pcmBuffer) < threshold;
}

/**
 * Convert stereo to mono by averaging channels
 */
export function stereoToMono(pcmBuffer) {
  const stereoSamples = Math.floor(pcmBuffer.length / 4);  // 2 channels, 2 bytes each
  const monoBuffer = Buffer.alloc(stereoSamples * 2);
  
  for (let i = 0; i < stereoSamples; i++) {
    const left = pcmBuffer.readInt16LE(i * 4);
    const right = pcmBuffer.readInt16LE(i * 4 + 2);
    const mono = Math.round((left + right) / 2);
    monoBuffer.writeInt16LE(mono, i * 2);
  }
  
  return monoBuffer;
}
