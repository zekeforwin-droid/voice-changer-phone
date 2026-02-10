/**
 * Voice Changer Phone System - Main Server
 * 
 * Handles Twilio Media Streams and voice transformation via ElevenLabs.
 * 
 * Flow:
 * 1. Twilio call connects via WebSocket
 * 2. Audio chunks (μ-law 8kHz) received from Twilio
 * 3. Buffered, converted to PCM, sent to ElevenLabs STS
 * 4. Transformed audio converted back to μ-law, sent to Twilio
 */

import 'dotenv/config';
import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocket } from 'ws';

import { handleMediaStream } from './services/media-stream.js';
import { CallManager } from './services/call-manager.js';
import { VoiceTransformer } from './services/voice-transformer.js';
import { createLogger } from './utils/logger.js';
import { VOICE_PRESETS } from './utils/voice-presets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logger
const logger = createLogger('server');

// Initialize Fastify
const fastify = Fastify({
  logger: false, // Using custom logger
});

// Register plugins
await fastify.register(websocket);
await fastify.register(fastifyStatic, {
  root: path.join(__dirname, '..', 'public'),
  prefix: '/',
});

// Initialize services
const callManager = new CallManager();
const voiceTransformer = new VoiceTransformer();

// ============================================
// WebSocket Route - Twilio Media Streams
// ============================================
fastify.register(async function (fastify) {
  fastify.get('/media-stream', { websocket: true }, (socket, req) => {
    const params = new URL(req.url, `http://${req.headers.host}`).searchParams;
    const voicePreset = params.get('voicePreset') || 'deep_male';
    const callId = params.get('callId') || 'unknown';
    
    logger.info(`WebSocket connected - Call: ${callId}, Voice: ${voicePreset}`);
    
    handleMediaStream(socket, {
      callId,
      voicePreset,
      callManager,
      voiceTransformer,
      logger,
    });
  });
});

// ============================================
// HTTP Routes - Twilio Webhooks
// ============================================

/**
 * POST /voice - Initial TwiML for incoming/outgoing calls
 * Returns TwiML that sets up bidirectional Media Stream
 */
fastify.post('/voice', async (request, reply) => {
  const { voicePreset = 'deep_male', toNumber } = request.body || {};
  const callId = request.body?.CallSid || `call_${Date.now()}`;
  
  logger.info(`🔥 POST /voice webhook called!`);
  logger.info(`   CallSid: ${callId}`);
  logger.info(`   Voice: ${voicePreset}`);
  logger.info(`   Headers: ${JSON.stringify(request.headers)}`);
  logger.info(`   Body: ${JSON.stringify(request.body)}`);
  
  // Build TwiML response
  const host = process.env.SERVER_URL?.replace(/^https?:\/\//, '') || request.headers.host;
  const wsUrl = `wss://${host}/media-stream?voicePreset=${voicePreset}&amp;callId=${callId}`;
  
  // TwiML for outbound call with voice transformation
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">Connecting your call with voice transformation.</Say>
  <Connect>
    <Stream url="${wsUrl}" track="both_tracks">
      <Parameter name="voicePreset" value="${voicePreset}" />
      <Parameter name="callId" value="${callId}" />
    </Stream>
  </Connect>
  <Pause length="3600" />
</Response>`;

  reply.type('text/xml').send(twiml);
});

/**
 * GET /voice - Test route for browser testing
 */
fastify.get('/voice', async (request, reply) => {
  const voicePreset = request.query.voicePreset || 'deep_male';
  logger.info(`TwiML test request - Voice: ${voicePreset}`);
  
  const host = process.env.SERVER_URL?.replace(/^https?:\/\//, '') || request.headers.host;
  const wsUrl = `wss://${host}/media-stream?voicePreset=${voicePreset}&amp;callId=test123`;
  
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">Test TwiML generated successfully. Voice preset: ${voicePreset}</Say>
  <Connect>
    <Stream url="${wsUrl}" track="both_tracks">
      <Parameter name="voicePreset" value="${voicePreset}" />
      <Parameter name="callId" value="test123" />
    </Stream>
  </Connect>
</Response>`;

  reply.type('text/xml').send(twiml);
});

/**
 * POST /voice/outbound - TwiML for the outbound leg (recipient side)
 */
fastify.post('/voice/outbound', async (request, reply) => {
  const voicePreset = request.query.voicePreset || 'deep_male';
  const callId = request.body?.CallSid || `call_${Date.now()}`;
  
  logger.info(`Outbound TwiML - CallSid: ${callId}`);
  
  const host = process.env.SERVER_URL?.replace(/^https?:\/\//, '') || request.headers.host;
  const wsUrl = `wss://${host}/media-stream?voicePreset=${voicePreset}&amp;callId=${callId}&amp;direction=outbound`;
  
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${wsUrl}" track="inbound_track">
      <Parameter name="voicePreset" value="${voicePreset}" />
      <Parameter name="direction" value="outbound" />
    </Stream>
  </Connect>
  <Pause length="3600" />
</Response>`;

  reply.type('text/xml').send(twiml);
});

/**
 * POST /call-status - Call status webhook
 */
fastify.post('/call-status', async (request, reply) => {
  const { CallSid, CallStatus, CallDuration, From, To } = request.body || {};
  
  logger.info(`📞 Call Status Webhook: ${CallSid} - ${CallStatus} (${CallDuration}s)`);
  logger.info(`   From: ${From}, To: ${To}`);
  logger.info(`   Status Body: ${JSON.stringify(request.body)}`);
  
  // Track call metrics
  if (CallStatus === 'completed') {
    callManager.recordCallEnd(CallSid, {
      duration: parseInt(CallDuration) || 0,
      from: From,
      to: To,
    });
  }
  
  reply.send({ received: true });
});

// ============================================
// API Routes - Call Control
// ============================================

/**
 * POST /api/call - Initiate an outbound call
 */
fastify.post('/api/call', async (request, reply) => {
  const { phone, voice = 'deep_male' } = request.body;
  
  if (!phone) {
    return reply.status(400).send({ success: false, error: 'Phone number required' });
  }
  
  try {
    const result = await callManager.initiateCall(phone, voice);
    logger.info(`Call initiated: ${result.callSid} to ${phone} with voice ${voice}`);
    
    reply.send({
      success: true,
      callSid: result.callSid,
      voice: voice,
      to: phone,
    });
  } catch (error) {
    logger.error(`Call initiation failed: ${error.message}`);
    reply.status(500).send({ success: false, error: error.message });
  }
});

/**
 * GET /api/call/:callSid - Get call status
 */
fastify.get('/api/call/:callSid', async (request, reply) => {
  const { callSid } = request.params;
  
  try {
    const status = await callManager.getCallStatus(callSid);
    reply.send({ success: true, status });
  } catch (error) {
    reply.status(500).send({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/call/:callSid - End a call
 */
fastify.delete('/api/call/:callSid', async (request, reply) => {
  const { callSid } = request.params;
  
  try {
    await callManager.endCall(callSid);
    reply.send({ success: true, message: 'Call ended' });
  } catch (error) {
    reply.status(500).send({ success: false, error: error.message });
  }
});

/**
 * GET /api/voices - Get available voice presets
 */
fastify.get('/api/voices', async (request, reply) => {
  reply.send({
    success: true,
    voices: Object.entries(VOICE_PRESETS).map(([id, info]) => ({
      id,
      ...info,
    })),
  });
});

/**
 * GET /api/stats - Get usage statistics
 */
fastify.get('/api/stats', async (request, reply) => {
  const stats = callManager.getStats();
  reply.send({ success: true, stats });
});

/**
 * GET /api/health - Health check
 */
fastify.get('/api/health', async (request, reply) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      twilio: !!process.env.TWILIO_ACCOUNT_SID,
      elevenlabs: !!process.env.ELEVENLABS_API_KEY,
    },
  };
  
  reply.send(health);
});

// ============================================
// Start Server
// ============================================
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

try {
  await fastify.listen({ port: PORT, host: HOST });
  logger.info(`🎭 Voice Changer Phone Server running on ${HOST}:${PORT}`);
  
  // Fix WebSocket URL - strip https:// from SERVER_URL  
  let serverUrl = process.env.SERVER_URL || `localhost:${PORT}`;
  if (serverUrl.startsWith('http://') || serverUrl.startsWith('https://')) {
    serverUrl = serverUrl.replace(/^https?:\/\//, '');
  }
  logger.info(`   WebSocket: wss://${serverUrl}/media-stream`);
  logger.info(`   Web UI: http://localhost:${PORT}`);
  
  // Log configuration status
  logger.info(`   Twilio: ${process.env.TWILIO_ACCOUNT_SID ? '✅ Configured' : '❌ Missing'}`);
  logger.info(`   ElevenLabs: ${process.env.ELEVENLABS_API_KEY ? '✅ Configured' : '❌ Missing'}`);
} catch (err) {
  logger.error(`Failed to start server: ${err.message}`);
  process.exit(1);
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down...');
  await fastify.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down...');
  await fastify.close();
  process.exit(0);
});
