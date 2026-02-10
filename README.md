# 🎭 Voice Changer Phone

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new?repo=https://github.com/zekeforwin-droid/voice-changer-phone)

Real-time voice transformation for phone calls using Twilio and ElevenLabs.

Make phone calls with your voice transformed into any character - deep male, soft female, British accent, and more. The recipient hears the transformed voice in real-time while you speak naturally.

---

## ⚡ One-Click Deploy

### Step 1: Get Your API Keys (10 min)

**ElevenLabs** ($5/month):
1. Go to [elevenlabs.io](https://elevenlabs.io) → Sign up
2. Subscribe to **Starter** plan ($5/mo)
3. Settings → API Keys → Create → **Copy the key**

**Twilio** (free trial + $1.15/mo for number):
1. Go to [twilio.com/try-twilio](https://www.twilio.com/try-twilio) → Sign up
2. From Console Dashboard, copy **Account SID** and **Auth Token**
3. Phone Numbers → Buy a Number → Choose with Voice capability
4. **Copy the phone number** (format: +1XXXXXXXXXX)

### Step 2: Deploy to Railway (5 min)

1. Click the **Deploy on Railway** button above
2. Sign in with GitHub
3. Fill in environment variables:
   - `TWILIO_ACCOUNT_SID` - Your Twilio Account SID
   - `TWILIO_AUTH_TOKEN` - Your Twilio Auth Token  
   - `TWILIO_PHONE_NUMBER` - Your Twilio phone number
   - `ELEVENLABS_API_KEY` - Your ElevenLabs API key
4. Click **Deploy**
5. Wait for deployment (~2 min)
6. Go to Settings → Domains → Generate Domain
7. Copy your Railway URL (e.g., `voice-changer-xxx.up.railway.app`)
8. Add one more variable: `SERVER_URL` = your Railway URL (without trailing /)

### Step 3: Configure Twilio Webhook (2 min)

1. In [Twilio Console](https://console.twilio.com) → Phone Numbers
2. Click your phone number
3. Under "A call comes in":
   - Webhook URL: `https://YOUR-RAILWAY-URL/voice`
   - HTTP: POST
4. Save

### Step 4: Make Your First Call! 🎉

1. Open your Railway URL in any browser
2. Enter a phone number (must be verified for trial accounts)
3. Pick a voice preset
4. Click **Start Call**
5. Answer and speak - the other person hears your transformed voice!

---

## 🎭 Voice Presets

| Voice | Style |
|-------|-------|
| Deep Male (Adam) | Deep, authoritative |
| Young Male (Josh) | Young, energetic |
| British Male (Harry) | British accent |
| Narrator (Marcus) | Professional |
| Soft Female (Bella) | Soft, gentle |
| Professional Female (Rachel) | Clear, business |
| Warm Female (Domi) | Warm, friendly |
| Mysterious (Arnold) | Deep, mysterious |
| Friendly Elder (Thomas) | Warm, elderly |

---

## 💰 Cost Estimate

~$12-15/month for prototype usage:

| Service | Cost |
|---------|------|
| ElevenLabs Starter | $5/month |
| Twilio Phone Number | $1.15/month |
| Twilio Calls (~2-5 hrs) | ~$3/month |
| Railway Starter | $5/month |

---

## 📱 Access From Anywhere

Once deployed, access your voice changer from:
- 💻 Any computer with a browser
- 📱 Your phone's browser
- 🌐 Any device with internet

Just bookmark your Railway URL!

---

## ⚙️ Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | `ACxxxx...` |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | `xxxxx...` |
| `TWILIO_PHONE_NUMBER` | Your Twilio number | `+15551234567` |
| `ELEVENLABS_API_KEY` | ElevenLabs API key | `sk_xxxx...` |
| `SERVER_URL` | Your Railway URL | `https://app.up.railway.app` |
| `PORT` | Server port (auto-set) | `3000` |
| `NODE_ENV` | Environment | `production` |

---

## 🔧 Troubleshooting

### Call won't connect
- **Trial account?** Add destination to Twilio → Verified Caller IDs
- Check Twilio Console → Logs → Calls for errors
- Verify webhook URL is correct

### Voice not transforming
- Check ElevenLabs has credits (Settings → Usage)
- Verify API key is correct
- Voice passes through unchanged on API errors

### High latency
- Reduce `AUDIO_BUFFER_MS` to 150
- Set `USE_FLASH_MODEL=true`

---

## 📚 Documentation

- [Quick Start Guide](docs/WIN-QUICKSTART.md)
- [Detailed Setup](docs/SETUP.md)
- [Usage Guide](docs/USAGE.md)
- [API Configuration](docs/API-CONFIGURATION.md)
- [Testing & Troubleshooting](docs/TESTING.md)

---

## 🛠️ Local Development

```bash
# Clone
git clone https://github.com/zekeforwin-droid/voice-changer-phone.git
cd voice-changer-phone

# Install
npm install

# Configure
cp .env.example .env
# Edit .env with your credentials

# Run
npm start

# Open http://localhost:3000
```

For local testing, use [ngrok](https://ngrok.com) to expose your server:
```bash
ngrok http 3000
# Use the HTTPS URL as SERVER_URL
```

---

## 📄 License

MIT - Use responsibly.

## ⚠️ Disclaimer

For legitimate use only. Do not use for fraud, impersonation, or harassment. Comply with all applicable laws.

---

Made with 🎭 by Zeke
