/**
 * Audio Bridge Service
 * 
 * Connects client audio stream (microphone) to Twilio Media Stream (call)
 * Handles voice transformation pipeline between the two streams
 */

import { createLogger } from '../utils/logger.js';

const logger = createLogger('audio-bridge');

export class AudioBridge {
  constructor(voiceTransformer) {
    this.voiceTransformer = voiceTransformer;
    
    // Track active bridges: callId -> { clientStream, twilioStream }
    this.activeBridges = new Map();
    
    logger.info('AudioBridge service initialized');
  }
  
  /**
   * Create a bridge between client audio stream and Twilio call
   */
  createBridge(callId, voicePreset) {
    const bridge = {
      callId,
      voicePreset,
      clientStream: null,
      twilioStream: null,
      twilioStreamSid: null,
      audioQueue: [],
      isProcessing: false,
      startTime: Date.now()
    };
    
    this.activeBridges.set(callId, bridge);
    logger.info(`🌉 Audio bridge created for call ${callId} with voice ${voicePreset}`);
    
    return bridge;
  }
  
  /**
   * Connect client audio stream to bridge
   */
  connectClientStream(callId, clientSocket) {
    const bridge = this.activeBridges.get(callId);
    if (!bridge) {
      logger.error(`No bridge found for call ${callId}`);
      return;
    }
    
    bridge.clientStream = clientSocket;
    logger.info(`📱 Client stream connected to bridge for call ${callId}`);
    
    // If Twilio stream is already connected, start processing
    if (bridge.twilioStream && bridge.twilioStreamSid) {
      this.startAudioProcessing(callId);
    }
  }
  
  /**
   * Connect Twilio Media Stream to bridge
   */
  connectTwilioStream(callId, twilioSocket, streamSid) {
    const bridge = this.activeBridges.get(callId);
    if (!bridge) {
      logger.error(`No bridge found for call ${callId}`);
      return;
    }
    
    bridge.twilioStream = twilioSocket;
    bridge.twilioStreamSid = streamSid;
    logger.info(`📞 Twilio stream ${streamSid} connected to bridge for call ${callId}`);
    
    // If client stream is already connected, start processing
    if (bridge.clientStream) {
      this.startAudioProcessing(callId);
    }
  }
  
  /**
   * Process client audio and forward to Twilio call
   */
  async processClientAudio(callId, audioData) {
    const bridge = this.activeBridges.get(callId);
    if (!bridge) {
      logger.warn(`No bridge found for call ${callId} - dropping audio`);
      return;
    }
    
    // Add to queue for processing
    bridge.audioQueue.push({
      data: audioData,
      timestamp: Date.now()
    });
    
    // Start processing if not already running
    if (!bridge.isProcessing && bridge.twilioStream && bridge.twilioStreamSid) {
      bridge.isProcessing = true;
      this.processAudioQueue(callId);
    }
  }
  
  /**
   * Process queued audio chunks
   */
  async processAudioQueue(callId) {
    const bridge = this.activeBridges.get(callId);
    if (!bridge) return;
    
    while (bridge.audioQueue.length > 0) {
      const audioChunk = bridge.audioQueue.shift();
      
      try {
        // For now, send raw audio without transformation
        // TODO: Implement WebM -> PCM -> Transform -> μ-law pipeline
        await this.forwardAudioToTwilio(bridge, audioChunk.data);
        
      } catch (error) {
        logger.error(`Audio processing error for call ${callId}: ${error.message}`);
      }
    }
    
    bridge.isProcessing = false;
  }
  
  /**
   * Forward audio to Twilio Media Stream (placeholder implementation)
   */
  async forwardAudioToTwilio(bridge, audioData) {
    if (!bridge.twilioStream || !bridge.twilioStreamSid) {
      logger.warn(`Cannot forward audio - Twilio stream not connected for call ${bridge.callId}`);
      return;
    }
    
    logger.info(`🎵 Forwarding ${audioData.length} bytes to Twilio stream ${bridge.twilioStreamSid}`);
    
    // TODO: Implement actual audio forwarding
    // This requires:
    // 1. Convert WebM to PCM
    // 2. Transform with voice preset  
    // 3. Convert to μ-law
    // 4. Send as Twilio media message
    
    // For now, just log that we would forward the audio
    logger.info(`📞 Would send transformed audio to call ${bridge.callId}`);
  }
  
  /**
   * Start audio processing between streams
   */
  startAudioProcessing(callId) {
    const bridge = this.activeBridges.get(callId);
    if (!bridge) return;
    
    logger.info(`🎬 Starting audio processing for call ${callId}`);
    logger.info(`   Client: ${bridge.clientStream ? 'Connected' : 'Missing'}`);
    logger.info(`   Twilio: ${bridge.twilioStream ? 'Connected' : 'Missing'}`);
    logger.info(`   StreamSid: ${bridge.twilioStreamSid || 'Missing'}`);
    
    // Processing will happen as client audio arrives via processClientAudio()
  }
  
  /**
   * Remove bridge and cleanup
   */
  removeBridge(callId) {
    const bridge = this.activeBridges.get(callId);
    if (bridge) {
      const duration = Date.now() - bridge.startTime;
      logger.info(`🗑️ Removing audio bridge for call ${callId} (${duration}ms active)`);
      
      bridge.isProcessing = false;
      bridge.audioQueue = [];
    }
    
    this.activeBridges.delete(callId);
  }
  
  /**
   * Get bridge status for debugging
   */
  getBridgeStatus(callId) {
    const bridge = this.activeBridges.get(callId);
    if (!bridge) return null;
    
    return {
      callId: bridge.callId,
      voicePreset: bridge.voicePreset,
      clientConnected: !!bridge.clientStream,
      twilioConnected: !!bridge.twilioStream,
      streamSid: bridge.twilioStreamSid,
      queuedAudio: bridge.audioQueue.length,
      isProcessing: bridge.isProcessing,
      uptime: Date.now() - bridge.startTime
    };
  }
  
  /**
   * Get all active bridges
   */
  getActiveBridges() {
    return Array.from(this.activeBridges.keys()).map(callId => 
      this.getBridgeStatus(callId)
    );
  }
}