# Testing & Troubleshooting Guide

Complete guide for testing the voice changer system and resolving issues.

---

## Pre-Flight Checklist

Before making your first call, verify:

- [ ] Node.js 20+ installed (`node --version`)
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file created with all required variables
- [ ] Server starts without errors (`npm start`)
- [ ] Web UI loads (http://localhost:3000)
- [ ] All status dots are green
- [ ] ngrok tunnel running (for local dev)
- [ ] Twilio webhook configured (for production)

---

## Running Tests

### Audio Pipeline Test

Tests the core audio processing without making a call:

```bash
npm test
# Or
node scripts/test-audio.js
```

**Expected output:**
```
🧪 Voice Changer Phone - Audio Pipeline Tests

Test 1: μ-law Encoding/Decoding
   ✅ PASSED (max error: 256)

Test 2: Resampling (8kHz → 16kHz → 8kHz)
   ✅ PASSED

Test 3: RMS Calculation
   ✅ PASSED (silent: 0, loud: 17321)

Test 4: ElevenLabs API Connection
   ✅ PASSED (24 voices available)

Test 5: Environment Configuration
   ✅ All environment variables configured

==================================================
Tests: 5 passed, 0 failed
==================================================
```

### Server Health Check

```bash
curl http://localhost:3000/api/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-11T01:38:00.000Z",
  "uptime": 123.45,
  "services": {
    "twilio": true,
    "elevenlabs": true
  }
}
```

### Test Call (CLI)

```bash
node scripts/initiate-call.js +15551234567 deep_male
```

---

## Latency Testing

### Measuring Latency

1. **Start a call** via web UI
2. **Watch server logs** for latency metrics
3. **Target:** <400ms total pipeline

### Latency Breakdown

| Stage | Expected | Action if Slow |
|-------|----------|----------------|
| Twilio → Server | 10-30ms | Check server region |
| Audio Buffering | 150-200ms | Reduce AUDIO_BUFFER_MS |
| Voice Transform | 75-150ms | Use Flash model |
| Server → Twilio | 10-30ms | Check server region |
| **Total** | **245-410ms** | |

### Optimizing Latency

1. **Reduce buffer size:**
   ```env
   AUDIO_BUFFER_MS=150
   ```

2. **Use Flash model:**
   ```env
   USE_FLASH_MODEL=true
   ```

3. **Deploy to US East:**
   - Railway: Select US East region
   - Closer to Twilio's media servers

4. **Use wired internet:**
   - Reduces network jitter
   - More consistent latency

---

## Common Issues & Solutions

### Issue: Server Won't Start

**Symptom:** Error on `npm start`

**Solutions:**
1. Check Node.js version: `node --version` (need 20+)
2. Reinstall dependencies: `rm -rf node_modules && npm install`
3. Check for port conflicts: `lsof -i :3000`
4. Check `.env` file exists and is valid

### Issue: "Cannot connect to server" in Web UI

**Symptom:** Gray status dots, can't make calls

**Solutions:**
1. Verify server is running
2. Check browser console for errors
3. Verify SERVER_URL matches your actual URL
4. For ngrok, check tunnel is active

### Issue: Twilio Status Red

**Symptom:** Twilio dot is red in web UI

**Solutions:**
1. Verify `TWILIO_ACCOUNT_SID` starts with `AC`
2. Verify `TWILIO_AUTH_TOKEN` is correct (not API key)
3. Check Twilio account is active
4. Check for typos in credentials

### Issue: ElevenLabs Status Red

**Symptom:** ElevenLabs dot is red in web UI

**Solutions:**
1. Verify `ELEVENLABS_API_KEY` starts with `sk_`
2. Check API key hasn't been revoked
3. Verify you have API credits remaining
4. Test API directly:
   ```bash
   curl -H "xi-api-key: YOUR_KEY" https://api.elevenlabs.io/v1/voices
   ```

### Issue: Call Initiated but Phone Doesn't Ring

**Symptom:** Call shows as initiated but no incoming call

**Solutions:**
1. **Trial account:** Verify destination number is in Twilio's Verified Caller IDs
2. Check Twilio Console → Logs → Calls for error messages
3. Verify phone number format (+1 country code)
4. Check Twilio account has credit

### Issue: Voice Not Transformed

**Symptom:** Hearing original voice instead of transformed

**Solutions:**
1. Check ElevenLabs API key is valid
2. Check server logs for ElevenLabs errors
3. Verify you have API credits remaining
4. Voice passes through unchanged on API errors (by design)

### Issue: Call Drops After a Few Seconds

**Symptom:** Call connects then immediately drops

**Solutions:**
1. Check Twilio webhook URL is correct
2. Verify server is publicly accessible (ngrok for local)
3. Check server logs for WebSocket errors
4. Verify SSL certificate is valid

### Issue: Audio Sounds Robotic/Choppy

**Symptom:** Transformed voice has artifacts

**Solutions:**
1. Increase buffer size: `AUDIO_BUFFER_MS=250`
2. Check network stability
3. Reduce background noise
4. Try different voice presets
5. Check CPU usage on server

### Issue: High Latency (>500ms)

**Symptom:** Noticeable delay in conversation

**Solutions:**
1. Reduce buffer: `AUDIO_BUFFER_MS=150`
2. Enable Flash model: `USE_FLASH_MODEL=true`
3. Deploy server closer to US East
4. Use wired internet
5. Check for network congestion

### Issue: "Rate Limit Exceeded" Errors

**Symptom:** Calls fail with rate limit errors

**Solutions:**
1. Wait and retry (temporary limit)
2. Check ElevenLabs usage dashboard
3. Upgrade ElevenLabs plan for higher limits
4. Implement request queuing

---

## Debug Logging

### Enable Verbose Logs

```env
LOG_LEVEL=debug
```

### Check Railway Logs

```bash
railway logs
# Or in Railway dashboard → Deployments → View Logs
```

### Check Twilio Logs

1. Go to Twilio Console
2. Monitor → Logs → Calls
3. Click a call for detailed logs

### Check ElevenLabs Usage

1. Go to ElevenLabs → Settings
2. Check Usage tab
3. Monitor character count

---

## End-to-End Test Procedure

### Full System Test

1. **Start server locally:**
   ```bash
   npm start
   ```

2. **Start ngrok:**
   ```bash
   ngrok http 3000
   ```

3. **Update .env with ngrok URL:**
   ```env
   SERVER_URL=https://xxxx.ngrok.io
   ```

4. **Restart server** (to pick up new URL)

5. **Open web UI:** http://localhost:3000

6. **Verify status dots** are all green

7. **Initiate test call** to your own phone

8. **Speak into the call** and listen for transformed voice

9. **Check latency** - should feel natural

10. **End call** and verify stats update

### Validation Checklist

- [ ] Call connects within 5 seconds
- [ ] Voice transformation is applied
- [ ] Latency is acceptable (<400ms)
- [ ] Call quality is clear
- [ ] Call ends cleanly
- [ ] Stats update correctly

---

## Performance Benchmarks

### Expected Metrics

| Metric | Good | Acceptable | Poor |
|--------|------|------------|------|
| Call connect time | <3s | <5s | >5s |
| Voice transform latency | <300ms | <400ms | >500ms |
| Audio quality (subjective) | Clear | Slight artifacts | Robotic |
| CPU usage | <30% | <50% | >70% |
| Memory usage | <200MB | <500MB | >1GB |

### Monitoring

Watch these metrics during calls:
- Server CPU/Memory
- Network latency to Twilio
- ElevenLabs API response times
- WebSocket connection stability

---

## Getting Help

If you can't resolve an issue:

1. **Collect logs** from server, Twilio, and browser console
2. **Note the exact error message**
3. **Describe the steps to reproduce**
4. **Check if it's intermittent or consistent**
5. **Ask Zeke!**
