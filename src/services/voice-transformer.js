/**
 * Voice Transformer Service
 * 
 * Integrates with ElevenLabs Speech-to-Speech API for real-time voice transformation.
 * Handles streaming, buffering, and voice preset management.
 */

import { VOICE_PRESETS, getVoiceId } from '../utils/voice-presets.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('voice-transformer');

// ElevenLabs API configuration
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';
const API_KEY = process.env.ELEVENLABS_API_KEY;

// Model options - flash for low latency
const DEFAULT_MODEL = 'eleven_english_sts_v2';
const FLASH_MODEL = 'eleven_flash_v2_5';  // Lower latency

export class VoiceTransformer {
  constructor() {
    this.activeStreams = new Map();
    this.usageTracker = {
      totalCharacters: 0,
      totalAudioSeconds: 0,
      callCount: 0,
    };
    
    // Verify API key on startup
    if (!API_KEY) {
      logger.warn('ELEVENLABS_API_KEY not set - voice transformation will be disabled');
    }
  }
  
  /**
   * Initialize a stream for a call
   */
  async initializeStream(callId, voicePreset) {
    this.activeStreams.set(callId, {
      voicePreset,
      startTime: Date.now(),
      audioProcessed: 0,
    });
    
    logger.info(`Initialized stream for call ${callId} with voice ${voicePreset}`);
  }
  
  /**
   * Transform audio using ElevenLabs Speech-to-Speech
   * 
   * @param {Buffer} pcmBuffer - PCM audio data (16-bit signed, 16kHz)
   * @param {string} voicePreset - Voice preset ID
   * @param {object} options - Additional options
   * @returns {Promise<Buffer>} - Transformed PCM audio
   */
  async transform(pcmBuffer, voicePreset, options = {}) {
    if (!API_KEY) {
      // Pass through audio unchanged if no API key
      logger.debug('No API key - passing through audio unchanged');
      return pcmBuffer;
    }
    
    const voiceId = getVoiceId(voicePreset);
    if (!voiceId) {
      logger.error(`Unknown voice preset: ${voicePreset}`);
      return pcmBuffer;
    }
    
    const sampleRate = options.sampleRate || 16000;
    
    try {
      // Convert PCM buffer to WAV format for API
      const wavBuffer = this.pcmToWav(pcmBuffer, sampleRate);
      
      // Use streaming endpoint for low latency
      const useFlash = process.env.USE_FLASH_MODEL === 'true';
      const modelId = useFlash ? FLASH_MODEL : DEFAULT_MODEL;
      
      const response = await this.callSpeechToSpeechAPI(voiceId, wavBuffer, {
        modelId,
        outputFormat: `pcm_${sampleRate}`,
        voiceSettings: VOICE_PRESETS[voicePreset]?.settings || {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      });
      
      // Track usage
      const audioSeconds = pcmBuffer.length / (sampleRate * 2); // 16-bit = 2 bytes per sample
      this.usageTracker.totalAudioSeconds += audioSeconds;
      
      return response;
      
    } catch (error) {
      logger.error(`Voice transformation failed: ${error.message}`);
      // Return original audio on error to maintain call continuity
      return pcmBuffer;
    }
  }
  
  /**
   * Call ElevenLabs Speech-to-Speech API
   */
  async callSpeechToSpeechAPI(voiceId, audioBuffer, options) {
    const { modelId, outputFormat, voiceSettings } = options;
    
    const formData = new FormData();
    formData.append('audio', new Blob([audioBuffer], { type: 'audio/wav' }), 'input.wav');
    formData.append('model_id', modelId);
    formData.append('output_format', outputFormat);
    
    if (voiceSettings) {
      formData.append('voice_settings', JSON.stringify(voiceSettings));
    }
    
    const url = `${ELEVENLABS_API_URL}/speech-to-speech/${voiceId}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }
    
    // Get audio data from response
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
  
  /**
   * Convert PCM buffer to WAV format
   */
  pcmToWav(pcmBuffer, sampleRate = 16000, numChannels = 1, bitsPerSample = 16) {
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = pcmBuffer.length;
    const headerSize = 44;
    
    const wavBuffer = Buffer.alloc(headerSize + dataSize);
    let offset = 0;
    
    // RIFF header
    wavBuffer.write('RIFF', offset); offset += 4;
    wavBuffer.writeUInt32LE(36 + dataSize, offset); offset += 4;
    wavBuffer.write('WAVE', offset); offset += 4;
    
    // fmt chunk
    wavBuffer.write('fmt ', offset); offset += 4;
    wavBuffer.writeUInt32LE(16, offset); offset += 4;  // Chunk size
    wavBuffer.writeUInt16LE(1, offset); offset += 2;   // Audio format (PCM)
    wavBuffer.writeUInt16LE(numChannels, offset); offset += 2;
    wavBuffer.writeUInt32LE(sampleRate, offset); offset += 4;
    wavBuffer.writeUInt32LE(byteRate, offset); offset += 4;
    wavBuffer.writeUInt16LE(blockAlign, offset); offset += 2;
    wavBuffer.writeUInt16LE(bitsPerSample, offset); offset += 2;
    
    // data chunk
    wavBuffer.write('data', offset); offset += 4;
    wavBuffer.writeUInt32LE(dataSize, offset); offset += 4;
    
    // Copy PCM data
    pcmBuffer.copy(wavBuffer, offset);
    
    return wavBuffer;
  }
  
  /**
   * Close a stream
   */
  async closeStream(callId) {
    const stream = this.activeStreams.get(callId);
    if (stream) {
      const duration = (Date.now() - stream.startTime) / 1000;
      logger.info(`Stream ${callId} closed after ${duration.toFixed(1)}s`);
      
      this.usageTracker.callCount++;
      this.activeStreams.delete(callId);
    }
  }
  
  /**
   * Get usage statistics
   */
  getUsage() {
    return {
      ...this.usageTracker,
      activeStreams: this.activeStreams.size,
      estimatedCost: this.estimateCost(),
    };
  }
  
  /**
   * Estimate cost based on usage
   * ElevenLabs pricing: ~$0.30 per 1000 characters for starter tier
   * Approx 150 words per minute = ~750 characters per minute
   */
  estimateCost() {
    // Rough estimate: ~750 characters per minute of speech
    const estimatedCharacters = this.usageTracker.totalAudioSeconds * 12.5; // ~750/60
    // Starter tier: $5/month for 30,000 characters
    const costPerCharacter = 5 / 30000;
    return (estimatedCharacters * costPerCharacter).toFixed(2);
  }
  
  /**
   * Test the ElevenLabs connection
   */
  async testConnection() {
    if (!API_KEY) {
      return { success: false, error: 'API key not configured' };
    }
    
    try {
      const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
        headers: {
          'xi-api-key': API_KEY,
        },
      });
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      
      const data = await response.json();
      return {
        success: true,
        voiceCount: data.voices?.length || 0,
        message: 'ElevenLabs connection successful',
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
