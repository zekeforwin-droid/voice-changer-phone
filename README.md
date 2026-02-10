# 🎭 Voice Changer Phone

Real-time voice transformation for phone calls using Twilio and ElevenLabs.

Make phone calls with your voice transformed into any character - deep male, soft female, British accent, and more. The recipient hears the transformed voice in real-time while you speak naturally.

## Features

- **Real-time voice transformation** - <400ms latency
- **Multiple voice presets** - 9+ voices included
- **Custom voice cloning** - Use your own ElevenLabs voices
- **Simple web UI** - Easy call initiation
- **CLI support** - Quick calls from terminal
- **Usage tracking** - Monitor costs in real-time
- **Production ready** - Deploy to Railway in minutes

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 3. Start the server
npm start

# 4. Open http://localhost:3000
```

## Requirements

- Node.js 20+
- [Twilio Account](https://www.twilio.com/try-twilio) (with phone number)
- [ElevenLabs Account](https://elevenlabs.io) (Starter plan: $5/mo)

## Architecture

```
Win's Phone → Twilio → WebSocket → Voice Transform → WebSocket → Twilio → Recipient
                         ↓                              ↓
                   Audio Buffer                   Audio Buffer
                         ↓                              ↓
                   μ-law → PCM                   PCM → μ-law
                         ↓                              ↓
                     ElevenLabs Speech-to-Speech
```

## Voice Presets

| Voice | Description |
|-------|-------------|
| Deep Male (Adam) | Deep, authoritative |
| Young Male (Josh) | Young, energetic |
| British Male (Harry) | British accent |
| Soft Female (Bella) | Soft, gentle |
| Professional Female (Rachel) | Clear, professional |
| Warm Female (Domi) | Warm, friendly |
| Mysterious (Arnold) | Deep, mysterious |
| Narrator (Marcus) | Professional narrator |
| Friendly Elder (Thomas) | Warm, elderly |

## Configuration

See `.env.example` for all options:

```env
# Required
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxx
TWILIO_PHONE_NUMBER=+15551234567
ELEVENLABS_API_KEY=sk_xxxx
SERVER_URL=https://your-server.com

# Optional
AUDIO_BUFFER_MS=200      # Latency tuning
USE_FLASH_MODEL=true     # Lower latency
CUSTOM_VOICE_ID=xxxx     # Custom cloned voice
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Web UI |
| `/api/call` | POST | Initiate a call |
| `/api/call/:sid` | GET | Get call status |
| `/api/call/:sid` | DELETE | End a call |
| `/api/voices` | GET | List available voices |
| `/api/stats` | GET | Usage statistics |
| `/api/health` | GET | Health check |

## Deployment

### Railway (Recommended)

1. Connect GitHub repo to Railway
2. Add environment variables
3. Deploy automatically

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

### Other Platforms

The app runs on any Node.js hosting with WebSocket support:
- Render
- Fly.io
- AWS EC2/ECS
- Google Cloud Run

## Cost Estimate

For ~2-5 hours of calls per month:

| Service | Cost |
|---------|------|
| ElevenLabs Starter | $5/mo |
| Twilio Phone Number | $1.15/mo |
| Twilio Calls | ~$3/mo |
| Hosting (Railway) | $5/mo |
| **Total** | **~$14/mo** |

## Documentation

- [Setup Guide](docs/SETUP.md) - Detailed setup instructions
- [Usage Guide](docs/USAGE.md) - Daily usage instructions
- [Troubleshooting](docs/USAGE.md#troubleshooting) - Common issues

## Development

```bash
# Run with auto-reload
npm run dev

# Run tests
npm test

# Initiate test call
npm run call +15551234567 deep_male
```

## License

MIT - Use responsibly.

## Disclaimer

This tool is for legitimate use only. Do not use for fraud, impersonation, or harassment. Comply with all applicable laws regarding voice alteration in phone calls.
