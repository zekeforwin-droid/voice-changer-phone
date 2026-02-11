/**
 * Media Stream Handler
 * 
 * Handles bidirectional audio streaming with Twilio Media Streams.
 * Receives μ-law audio, buffers it, transforms via ElevenLabs, and sends back.
 */

import { AudioBuffer } from '../utils/audio-buffer.js';
import { mulawDecode, mulawEncode, resample } from '../utils/audio-codec.js';
import { LatencyTracker } from '../utils/latency-tracker.js';

// Configuration
const BUFFER_MS = parseInt(process.env.AUDIO_BUFFER_MS) || 200;
const SAMPLE_RATE_TWILIO = 8000;  // Twilio's μ-law sample rate
const SAMPLE_RATE_ELEVENLABS = 16000;  // ElevenLabs optimal input rate

/**
 * Handle a Twilio Media Stream WebSocket connection
 */
export function handleMediaStream(socket, options) {
  const { callId, voicePreset, callManager, voiceTransformer, audioBridge, logger } = options;
  
  logger.info(`🔌 Twilio Media Stream WebSocket CONNECTED for call ${callId}`);
  
  // State
  let streamSid = null;
  let isConnected = false;
  const audioBuffer = new AudioBuffer(BUFFER_MS, SAMPLE_RATE_TWILIO);
  const latencyTracker = new LatencyTracker();
  
  // Track active call
  callManager.addActiveStream(callId, {
    voicePreset,
    startTime: Date.now(),
  });
  
  // Process buffered audio
  async function processAudioBuffer() {
    if (!isConnected || !streamSid) return;
    
    const chunk = audioBuffer.flush();
    if (!chunk || chunk.length === 0) return;
    
    const startTime = Date.now();
    
    try {
      // 1. Decode μ-law to PCM (16-bit signed)
      const pcmBuffer = mulawDecode(chunk);
      
      // 2. Resample from 8kHz to 16kHz for ElevenLabs
      const resampledPcm = resample(pcmBuffer, SAMPLE_RATE_TWILIO, SAMPLE_RATE_ELEVENLABS);
      
      // 3. Transform voice via ElevenLabs
      const transformedPcm = await voiceTransformer.transform(resampledPcm, voicePreset, {
        sampleRate: SAMPLE_RATE_ELEVENLABS,
      });
      
      if (!transformedPcm || transformedPcm.length === 0) {
        logger.warn(`Empty transformation result for call ${callId}`);
        return;
      }
      
      // 4. Resample back to 8kHz for Twilio
      const outputPcm = resample(transformedPcm, SAMPLE_RATE_ELEVENLABS, SAMPLE_RATE_TWILIO);
      
      // 5. Encode to μ-law
      const mulawOutput = mulawEncode(outputPcm);
      
      // 6. Send back to Twilio
      const mediaMessage = {
        event: 'media',
        streamSid: streamSid,
        media: {
          payload: mulawOutput.toString('base64'),
        },
      };
      
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(mediaMessage));
      }
      
      // Track latency
      const processingTime = Date.now() - startTime;
      latencyTracker.record(processingTime);
      
      if (processingTime > 400) {
        logger.warn(`High latency detected: ${processingTime}ms for call ${callId}`);
      }
      
    } catch (error) {
      logger.error(`Audio processing error for call ${callId}: ${error.message}`);
      // Don't crash - just skip this chunk
    }
  }
  
  // Handle incoming WebSocket messages
  socket.on('message', async (rawData) => {
    try {
      const message = JSON.parse(rawData.toString());
      
      switch (message.event) {
        case 'connected':
          logger.info(`Twilio connected for call ${callId}`);
          isConnected = true;
          break;
          
        case 'start':
          streamSid = message.start.streamSid;
          const customParams = message.start.customParameters || {};
          
          logger.info(`📞 Twilio Stream started: ${streamSid} for call ${callId}`);
          logger.debug(`Stream params: ${JSON.stringify(customParams)}`);
          
          // Initialize voice transformer for this stream
          await voiceTransformer.initializeStream(callId, voicePreset);
          
          // Connect Twilio stream to audio bridge
          audioBridge.connectTwilioStream(callId, socket, streamSid);
          break;
          
        case 'media':
          // Receive audio chunk from Twilio
          const payload = Buffer.from(message.media.payload, 'base64');
          audioBuffer.push(payload);
          
          // Process when buffer is ready
          if (audioBuffer.isReady()) {
            // Don't await - process asynchronously to avoid blocking
            processAudioBuffer().catch(err => {
              logger.error(`Async processing error: ${err.message}`);
            });
          }
          break;
          
        case 'mark':
          // Audio playback marker (optional tracking)
          logger.debug(`Mark received: ${message.mark.name}`);
          break;
          
        case 'stop':
          logger.info(`Stream stopped for call ${callId}`);
          isConnected = false;
          
          // Cleanup
          await voiceTransformer.closeStream(callId);
          
          // Remove audio bridge
          audioBridge.removeBridge(callId);
          
          // Log metrics
          const metrics = latencyTracker.getMetrics();
          logger.info(`Call ${callId} metrics: avg=${metrics.average}ms, max=${metrics.max}ms, min=${metrics.min}ms`);
          
          callManager.removeActiveStream(callId);
          break;
          
        default:
          logger.debug(`Unknown event: ${message.event}`);
      }
      
    } catch (error) {
      logger.error(`WebSocket message error: ${error.message}`);
    }
  });
  
  socket.on('close', () => {
    logger.info(`WebSocket closed for call ${callId}`);
    isConnected = false;
    voiceTransformer.closeStream(callId).catch(() => {});
    callManager.removeActiveStream(callId);
  });
  
  socket.on('error', (error) => {
    logger.error(`WebSocket error for call ${callId}: ${error.message}`);
  });
}

/**
 * Create a mark message for Twilio
 * Useful for tracking audio playback
 */
export function createMarkMessage(streamSid, name) {
  return JSON.stringify({
    event: 'mark',
    streamSid: streamSid,
    mark: { name },
  });
}

/**
 * Create a clear message to stop Twilio audio playback
 */
export function createClearMessage(streamSid) {
  return JSON.stringify({
    event: 'clear',
    streamSid: streamSid,
  });
}

/**
 * Handle Client Audio Stream WebSocket connection
 * Receives microphone audio from browser, transforms it, forwards to Twilio call
 */
export function handleClientAudioStream(socket, options) {
  const { callId, voicePreset, callManager, voiceTransformer, audioBridge, logger } = options;
  
  // State
  let isConnected = false;
  let audioChunkCount = 0;
  
  logger.info(`🎤 Client audio stream started for call ${callId}`);
  
  // Create or get audio bridge for this call
  if (!audioBridge.getBridgeStatus(callId)) {
    audioBridge.createBridge(callId, voicePreset);
  }
  
  // Connect client stream to audio bridge
  audioBridge.connectClientStream(callId, socket);
  
  // Track active client stream
  callManager.addClientStream(callId, {
    voicePreset,
    startTime: Date.now(),
  });
  
  // Handle incoming audio chunks from browser
  socket.on('message', async (audioData) => {
    try {
      audioChunkCount++;
      
      // Log every chunk initially to debug
      logger.info(`📤 Received client audio chunk ${audioChunkCount} (${audioData.length} bytes) for call ${callId}`);
      
      // Audio data comes as WebM/Opus from MediaRecorder
      // We need to:
      // 1. Convert WebM to raw PCM
      // 2. Transform the voice 
      // 3. Convert to μ-law for Twilio
      // 4. Send to active Twilio call
      
      const startTime = Date.now();
      
      // Forward audio to bridge for processing and forwarding to Twilio
      await audioBridge.processClientAudio(callId, audioData);
      
      // Also log for debugging (can be removed later)
      await processClientAudio(audioData, callId, voicePreset, voiceTransformer, logger);
      
      const processingTime = Date.now() - startTime;
      if (processingTime > 50) {
        logger.warn(`Client audio processing took ${processingTime}ms for call ${callId}`);
      }
      
    } catch (error) {
      logger.error(`Client audio processing error for call ${callId}: ${error.message}`);
    }
  });
  
  socket.on('open', () => {
    logger.info(`Client audio stream connected for call ${callId}`);
    isConnected = true;
  });
  
  socket.on('close', () => {
    logger.info(`Client audio stream closed for call ${callId}`);
    isConnected = false;
    
    // Remove bridge if both streams are closed
    audioBridge.removeBridge(callId);
    
    callManager.removeClientStream?.(callId);
  });
  
  socket.on('error', (error) => {
    logger.error(`Client audio stream error for call ${callId}: ${error.message}`);
  });
}

/**
 * Process client audio data 
 * Currently logs received audio - needs full WebM->Voice Transform->Twilio pipeline
 */
async function processClientAudio(webmAudioData, callId, voicePreset, voiceTransformer, logger) {
  // Log that we're processing audio
  logger.info(`🎵 Processing ${webmAudioData.length} bytes of client audio for call ${callId} with voice ${voicePreset}`);
  
  // TODO: Full implementation needs:
  // 1. WebM/Opus decoder (ffmpeg or web audio API)
  // 2. Voice transformation via ElevenLabs 
  // 3. Audio encoding to μ-law
  // 4. Send to Twilio Media Stream for the active call
  
  // For now, verify we can access the voice transformer
  try {
    // This doesn't do actual transformation yet, but validates the service
    logger.info(`🎭 Voice transformer available for preset: ${voicePreset}`);
    
    // TODO: Implement actual audio pipeline here
    // const pcmAudio = await decodeWebM(webmAudioData);
    // const transformedAudio = await voiceTransformer.transform(pcmAudio, voicePreset);  
    // const mulawAudio = await encodeMulaw(transformedAudio);
    // await sendToTwilioCall(callId, mulawAudio);
    
  } catch (error) {
    logger.error(`Voice processing failed: ${error.message}`);
  }
  
  return true;
}
