# API Configuration Guide

Detailed configuration for Twilio and ElevenLabs APIs.

---

## Twilio Configuration

### Account Setup

1. **Create Account**
   - Go to https://www.twilio.com/try-twilio
   - Sign up with email (Google/GitHub also works)
   - Verify your phone number

2. **Account Credentials**
   - Find in Console Dashboard
   - Account SID: Starts with `AC` (34 chars)
   - Auth Token: Click to reveal (32 chars)

3. **Phone Number**
   - Go to Phone Numbers → Manage → Buy a Number
   - Select a number with "Voice" capability
   - Note: Some regions require address verification
   - Cost: $1.15/month (US numbers)

### Webhook Configuration

After deploying your server, configure webhooks:

1. **Go to Phone Numbers → Active Numbers**
2. **Click your number**
3. **Voice & Fax section:**
   - A CALL COMES IN → Webhook
   - URL: `https://your-server.com/voice`
   - Method: HTTP POST
4. **Save**

### Twilio API Pricing

| Service | Rate |
|---------|------|
| Outbound Calls (US) | $0.014/min |
| Media Streams | $0.0025/min |
| Phone Number | $1.15/month |
| Inbound Calls | $0.0085/min |

### Trial Account Limits

- $15.50 free credit
- Can only call verified numbers
- "Trial account" announcement on calls
- Upgrade to remove limits ($20 minimum)

### Adding Verified Numbers (Trial)

1. Go to Console → Verified Caller IDs
2. Add numbers you want to call
3. Verify via SMS/call

---

## ElevenLabs Configuration

### Account Setup

1. **Create Account**
   - Go to https://elevenlabs.io
   - Sign up (free tier available)

2. **Choose Plan**
   - Free: 10,000 chars/month (very limited)
   - Starter: $5/month, 30,000 chars
   - Creator: $22/month, 100,000 chars

3. **Get API Key**
   - Settings → API Keys
   - Create new key
   - Copy and save securely

### Speech-to-Speech API

This is the core API we use for voice transformation.

**Endpoint:** `POST /v1/speech-to-speech/{voice_id}`

**Headers:**
```
xi-api-key: your_api_key
Content-Type: multipart/form-data
```

**Body:**
```
audio: <audio file>
model_id: eleven_english_sts_v2
output_format: pcm_16000
voice_settings: {"stability": 0.5, "similarity_boost": 0.75}
```

### Voice IDs

Pre-configured voices in our system:

| Preset | Voice ID | Name |
|--------|----------|------|
| deep_male | pNInz6obpgDQGcFmaJgB | Adam |
| young_male | TxGEqnHWrfWFTfGW9XjX | Josh |
| british_male | SOYHLrjzK2X1ezoPC6cr | Harry |
| soft_female | EXAVITQu4vr4xnSDxMaL | Bella |
| professional_female | 21m00Tcm4TlvDq8ikWAM | Rachel |
| warm_female | AZnzlk1XvdvUeBnXmlld | Domi |
| mysterious | VR6AewLTigWG4xSOukaG | Arnold |
| narrator_male | zcAOhNBS3c14rBihAFp1 | Marcus |
| friendly_elder | GBv7mTt0atIp3Br8iCZE | Thomas |

### Finding More Voices

1. Go to ElevenLabs → Voices
2. Browse the voice library
3. Click a voice → Copy Voice ID
4. Add to your `.env` as `CUSTOM_VOICE_ID`

### Voice Settings

| Setting | Range | Effect |
|---------|-------|--------|
| stability | 0.0-1.0 | Higher = more consistent, lower = more expressive |
| similarity_boost | 0.0-1.0 | Higher = closer to original voice |
| style | 0.0-1.0 | Style exaggeration (experimental) |
| use_speaker_boost | bool | Enhanced clarity |

**Recommended for phone calls:**
```json
{
  "stability": 0.5,
  "similarity_boost": 0.75,
  "style": 0.0,
  "use_speaker_boost": true
}
```

### Models

| Model | Latency | Quality | Use Case |
|-------|---------|---------|----------|
| eleven_english_sts_v2 | ~150ms | Excellent | Default |
| eleven_flash_v2_5 | ~75ms | Good | Low latency |
| eleven_multilingual_sts_v2 | ~200ms | Excellent | Non-English |

### Custom Voice Cloning

1. **Prepare Audio**
   - 1-5 minutes of clean speech
   - No background noise
   - Good quality microphone
   - Consistent volume

2. **Create Voice**
   - VoiceLab → Add Voice
   - Upload audio samples
   - Name your voice
   - Wait for processing (few minutes)

3. **Use Voice**
   - Copy Voice ID from voice settings
   - Set as `CUSTOM_VOICE_ID` in `.env`
   - Select "Custom" preset in web UI

### Character Usage Estimation

- Average speaking: ~150 words/minute
- Average word length: ~5 characters
- **~750 characters per minute of speech**

Starter plan (30,000 chars) ≈ **40 minutes** of voice transformation

---

## Environment Variables Summary

```env
# Twilio (Required)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+15551234567

# ElevenLabs (Required)
ELEVENLABS_API_KEY=sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Server (Required)
SERVER_URL=https://your-server.com
PORT=3000

# Optional
NODE_ENV=production
LOG_LEVEL=info
AUDIO_BUFFER_MS=200
USE_FLASH_MODEL=true
CUSTOM_VOICE_ID=your_custom_voice_id
```

---

## Rate Limits

### Twilio
- 1 concurrent call per number (upgrade for more)
- API rate limits vary by endpoint

### ElevenLabs
- Starter: ~10 concurrent requests
- Creator: ~20 concurrent requests
- Enterprise: Unlimited

### Our Server
- No built-in rate limits (add if needed)
- Consider adding MAX_CALLS_PER_HOUR

---

## Security Best Practices

1. **Never commit API keys** - Use environment variables
2. **Rotate keys regularly** - Especially if exposed
3. **Use minimum permissions** - Don't use admin keys
4. **Monitor usage** - Set up billing alerts
5. **Add authentication** - Protect your web UI
6. **Log carefully** - Don't log full API keys
