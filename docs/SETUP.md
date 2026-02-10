# Voice Changer Phone - Setup Guide

Complete step-by-step instructions to get the voice changer phone system running.

## Prerequisites

- Node.js 20 or later
- A credit card (for Twilio trial account)
- ~$10-12/month budget

---

## Step 1: Create ElevenLabs Account

1. **Go to [ElevenLabs](https://elevenlabs.io)**
   
2. **Sign up for an account**
   - Click "Get Started Free"
   - Use Google/GitHub or email

3. **Choose the Starter Plan ($5/month)**
   - Go to Settings → Subscription
   - Select "Starter" plan
   - This gives you 30,000 characters/month
   - For prototype phase, this is sufficient (~30-60 min of voice transformation)

4. **Get your API Key**
   - Go to Settings → API Keys
   - Click "Create API Key"
   - Copy the key (starts with `sk_...`)
   - **Save this as `ELEVENLABS_API_KEY`**

### Optional: Clone a Custom Voice

If you want a custom voice:
1. Go to VoiceLab → Add Generative or Cloned Voice
2. Upload 1-5 minutes of clean audio
3. Wait for processing
4. Copy the Voice ID from the voice details
5. **Save this as `CUSTOM_VOICE_ID`**

---

## Step 2: Create Twilio Account

1. **Go to [Twilio](https://www.twilio.com/try-twilio)**

2. **Sign up for a free trial**
   - Verify your email and phone number
   - You get ~$15 in trial credit

3. **Get your Account Credentials**
   - Go to Console Dashboard
   - Find "Account SID" and "Auth Token"
   - **Save these as `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`**

4. **Buy a Phone Number**
   - Go to Phone Numbers → Manage → Buy a Number
   - Choose a US number with Voice capability
   - Cost: $1.15/month
   - **Save this as `TWILIO_PHONE_NUMBER`** (e.g., `+15551234567`)

### Trial Account Limitations

With a trial account:
- You can only call verified numbers (add yours at Settings → Verified Caller IDs)
- Calls have a short announcement at the start
- Upgrade to paid account ($20 minimum) to remove limitations

---

## Step 3: Set Up the Server

### Option A: Local Development (with ngrok)

1. **Clone/Download the Project**
   ```bash
   cd projects/voice-changer-phone
   npm install
   ```

2. **Create `.env` file**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Install ngrok** (for local testing)
   ```bash
   # macOS
   brew install ngrok
   
   # Or download from https://ngrok.com/download
   ```

4. **Start ngrok tunnel**
   ```bash
   ngrok http 3000
   ```
   - Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
   - **Set this as `SERVER_URL` in your .env**

5. **Start the server**
   ```bash
   npm start
   ```

6. **Verify it's working**
   - Open http://localhost:3000 in browser
   - All status dots should be green

### Option B: Deploy to Railway (Recommended for Production)

1. **Create Railway Account**
   - Go to [Railway](https://railway.app)
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your repository

3. **Add Environment Variables**
   - Go to your project → Variables
   - Add all variables from `.env.example`:
     - `TWILIO_ACCOUNT_SID`
     - `TWILIO_AUTH_TOKEN`
     - `TWILIO_PHONE_NUMBER`
     - `ELEVENLABS_API_KEY`
     - `PORT=3000`
     - `NODE_ENV=production`

4. **Get Your Public URL**
   - Go to Settings → Domains
   - Generate a Railway domain (e.g., `your-app.up.railway.app`)
   - **Set this as `SERVER_URL`** (without trailing slash)

5. **Redeploy**
   - Railway will auto-deploy when you push changes
   - Check "Deployments" tab for logs

---

## Step 4: Configure Twilio Webhooks

1. **Go to Twilio Console → Phone Numbers**
   
2. **Click on your phone number**

3. **Under "Voice & Fax"**
   - A CALL COMES IN: Set to Webhook
   - URL: `https://your-server-url.com/voice`
   - HTTP: POST

4. **Save the configuration**

---

## Step 5: Test the System

### Quick Test via Web UI

1. Open your server URL in a browser
2. Enter a phone number (must be verified if using trial)
3. Select a voice preset
4. Click "Start Call"
5. Answer the call on your phone
6. Speak and hear the transformed voice

### Test via CLI

```bash
# From the project directory
node scripts/initiate-call.js +15551234567 deep_male
```

### Test Audio Pipeline Only

```bash
npm test
# Or
node scripts/test-audio.js
```

---

## Step 6: Cost Monitoring

### Track ElevenLabs Usage

1. Go to ElevenLabs → Settings → Usage
2. Monitor character count
3. Set up billing alerts if available

### Track Twilio Usage

1. Go to Twilio Console → Usage → Today's Usage
2. Monitor call minutes and costs
3. Set up usage triggers at Console → Billing → Usage Triggers

### Expected Monthly Costs (Prototype)

| Service | Cost |
|---------|------|
| ElevenLabs Starter | $5/month |
| Twilio Phone Number | $1.15/month |
| Twilio Calls (~2 hours) | ~$2-3/month |
| Twilio Media Streams | ~$0.50/month |
| Railway (Basic) | $5/month |
| **Total** | **~$12-15/month** |

---

## Troubleshooting

### "Cannot connect to server"
- Check if server is running
- Verify SERVER_URL is correct
- Check Railway deployment logs

### "Twilio not configured"
- Verify TWILIO_ACCOUNT_SID starts with `AC`
- Verify TWILIO_AUTH_TOKEN is correct
- Check Twilio Console for any account issues

### "ElevenLabs not configured"
- Verify ELEVENLABS_API_KEY is correct
- Check if you have API credits remaining
- Verify the API key has STS permissions

### "Call fails immediately"
- Check if destination number is verified (trial accounts)
- Verify TWILIO_PHONE_NUMBER is in E.164 format
- Check Twilio Console → Logs → Calls for error details

### "Voice transformation not working"
- Voice passes through unchanged if ElevenLabs fails
- Check server logs for errors
- Verify ElevenLabs API key and quota

### High Latency (>500ms)
- Reduce AUDIO_BUFFER_MS (try 150)
- Enable USE_FLASH_MODEL=true
- Deploy server closer to Twilio region (US East)

---

## Next Steps

1. **Customize Voices**: Add custom voice IDs to `.env`
2. **Optimize Latency**: Tune AUDIO_BUFFER_MS based on testing
3. **Add Security**: Implement authentication for the web UI
4. **Monitor**: Set up logging and alerting

See [USAGE.md](./USAGE.md) for daily usage instructions.
