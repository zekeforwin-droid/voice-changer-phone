# Voice Changer Phone Architecture (v2.0)

## Overview

This system allows users to make phone calls with real-time voice transformation using their laptop microphone.

## Architecture Flow

```
[User's Laptop]
      ↓ (speaks into mic)
[Browser getUserMedia()]
      ↓ (WebRTC audio capture)
[WebSocket: /client-audio-stream]
      ↓ (WebM/Opus chunks)
[Server: Audio Processing]
      ↓ (voice transformation)
[ElevenLabs Voice API]
      ↓ (transformed audio)
[Twilio Phone Call]
      ↓ (to called person)
[Called Person's Phone]
```

## Components

### 1. Frontend (Browser)
- **Microphone Capture**: Uses `getUserMedia()` to access laptop mic
- **Audio Visualization**: Real-time level meters
- **WebSocket Streaming**: Sends audio chunks to server via `/client-audio-stream`
- **Call Control**: Initiates calls, manages UI state

### 2. Backend Server
- **Client Audio Handler**: `/client-audio-stream` WebSocket endpoint
- **Twilio Media Handler**: `/media-stream` WebSocket endpoint (for receiving from called person)
- **Audio Pipeline**: WebM → PCM → Voice Transform → μ-law → Twilio
- **Call Management**: Twilio API integration for call control

### 3. Voice Transformation
- **Input**: WebM/Opus audio from browser microphone
- **Processing**: ElevenLabs Speech-to-Speech API
- **Output**: Transformed audio sent to called person

### 4. Twilio Integration
- **Outbound Calls**: Server initiates calls to target numbers
- **Media Streams**: Bidirectional audio streaming
- **Call Control**: Status tracking, call termination

## Audio Flow Details

### User → Called Person (Outbound Audio)
1. User speaks into laptop microphone
2. Browser captures audio via `MediaRecorder` (WebM/Opus, 100ms chunks)
3. Audio chunks sent to server via WebSocket
4. Server converts WebM → PCM
5. PCM audio sent to ElevenLabs for voice transformation
6. Transformed audio converted to μ-law (8kHz)
7. μ-law audio sent to Twilio call via Media Stream

### Called Person → User (Inbound Audio)
1. Called person speaks into their phone
2. Twilio sends audio to server via Media Stream WebSocket (μ-law)
3. Server converts μ-law → PCM
4. PCM audio sent back to user's browser (future enhancement)

## WebSocket Endpoints

### `/client-audio-stream`
- **Purpose**: Receives user's microphone audio
- **Protocol**: WebSocket Binary (WebM audio chunks)
- **Parameters**: `callId`, `voice` (voice preset)
- **Handler**: `handleClientAudioStream()`

### `/media-stream`
- **Purpose**: Twilio Media Stream integration
- **Protocol**: WebSocket JSON + Base64 audio
- **Parameters**: `callId`, `voicePreset`
- **Handler**: `handleMediaStream()`

## Call States

1. **Microphone Setup**: User grants mic access, audio levels visible
2. **Call Initiation**: User enters number, selects voice preset
3. **Connecting**: Server initiates Twilio call, establishes WebSocket connections
4. **Active Call**: Real-time audio streaming and transformation
5. **Call End**: Cleanup WebSocket connections, update statistics

## Technical Requirements

- **Browser**: Modern browser with WebRTC support
- **Microphone**: Working audio input device
- **Network**: Stable internet connection for real-time audio streaming
- **Server**: Node.js with WebSocket support
- **APIs**: Twilio (calls), ElevenLabs (voice transformation)

## Audio Processing Pipeline (TODO)

The current implementation has placeholders for:
1. **WebM Decoder**: Convert browser MediaRecorder output to PCM
2. **Audio Resampling**: Convert between sample rates (16kHz ↔ 8kHz)
3. **Voice Transformation**: ElevenLabs integration for real-time processing
4. **Audio Encoding**: Convert transformed PCM to μ-law for Twilio
5. **Bidirectional Audio**: Return called person's voice to user

## Security Considerations

- **Microphone Access**: Requires user permission
- **Audio Data**: Streamed in real-time, not permanently stored
- **Call Privacy**: Audio transformation happens server-side
- **API Keys**: ElevenLabs and Twilio credentials secured via environment variables

## Performance Notes

- **Latency**: Target <200ms end-to-end for natural conversation
- **Bandwidth**: ~16kbps for audio streaming (compressed)
- **CPU**: Real-time audio processing requires adequate server resources
- **Memory**: Audio buffers kept minimal for low latency

## Next Steps

1. Implement WebM → PCM audio decoding
2. Integrate ElevenLabs real-time voice transformation
3. Add bidirectional audio (called person → user)
4. Optimize for minimal latency
5. Add audio quality controls
6. Implement call recording (optional)