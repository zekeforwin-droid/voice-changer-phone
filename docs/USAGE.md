# Voice Changer Phone - Usage Guide

Daily usage instructions for Win.

---

## Quick Start

### Making a Call (Web UI)

1. **Open the web interface**
   - Local: http://localhost:3000
   - Production: https://your-app.up.railway.app

2. **Check system status**
   - All three dots should be green (Twilio, ElevenLabs, Server)
   - If any are red, check [Troubleshooting](#troubleshooting)

3. **Enter the phone number**
   - Use any format: `+1 555 123 4567` or `5551234567`
   - International calls work too (check Twilio pricing)

4. **Choose a voice**
   - Click on a voice preset card
   - Selected voice shows a purple border

5. **Click "Start Call"**
   - Wait for the call to connect
   - You'll see the active call panel

6. **Speak naturally**
   - Your voice is transformed in real-time
   - The recipient hears the transformed voice

7. **End the call**
   - Click "End Call" or hang up your phone
   - Stats update automatically

---

## Voice Presets

### Male Voices

| Preset | Description | Best For |
|--------|-------------|----------|
| **Deep Male (Adam)** | Deep, authoritative | Business calls, serious tone |
| **Young Male (Josh)** | Young, energetic | Casual calls, friendly tone |
| **British Male (Harry)** | British accent | International flair |
| **Narrator (Marcus)** | Professional narrator | Presentations, formal |

### Female Voices

| Preset | Description | Best For |
|--------|-------------|----------|
| **Soft Female (Bella)** | Soft, gentle | Customer service, calming |
| **Professional Female (Rachel)** | Clear, professional | Business, formal |
| **Warm Female (Domi)** | Warm, friendly | Personal calls |

### Character Voices

| Preset | Description | Best For |
|--------|-------------|----------|
| **Mysterious (Arnold)** | Deep, mysterious | Creative, dramatic |
| **Friendly Elder (Thomas)** | Warm, elderly | Trustworthy, paternal |

---

## CLI Usage

For quick calls without opening the browser:

```bash
# Basic call
node scripts/initiate-call.js +15551234567

# With specific voice
node scripts/initiate-call.js +15551234567 british_male

# Show help
node scripts/initiate-call.js --help
```

---

## Tips for Best Quality

### Speaking

1. **Use a good microphone**
   - Built-in phone mic works, but headset is better
   - Reduce background noise

2. **Speak clearly**
   - Normal pace, clear pronunciation
   - The AI handles accents well

3. **Maintain consistent volume**
   - Don't get too close/far from mic
   - Avoid sudden volume changes

### Latency

Expected delay: **200-400ms**

This is the time between when you speak and when the recipient hears it. It's noticeable but manageable for conversation.

**To reduce latency:**
- Use wired internet (not WiFi)
- Keep buffer size low (150-200ms)
- Use Flash model (enabled by default)

---

## Checking Usage & Costs

### In the Web UI

The "Usage Stats" card shows:
- **Total Calls**: Number of calls made
- **Minutes**: Total call duration
- **Est. Cost**: Estimated Twilio + ElevenLabs cost

### ElevenLabs Dashboard

1. Go to [ElevenLabs Settings](https://elevenlabs.io/app/settings)
2. Check "Usage" tab
3. Monitor character count (30,000/month on Starter)

### Twilio Dashboard

1. Go to [Twilio Console](https://console.twilio.com)
2. Check "Usage" section
3. Monitor call minutes and costs

---

## Troubleshooting

### Call Won't Connect

**Symptoms:** "Start Call" clicked but nothing happens

**Solutions:**
1. Check all status dots are green
2. Verify phone number format
3. For trial accounts, verify the destination number is in Twilio's verified list
4. Check server logs for errors

### Voice Sounds Robotic

**Symptoms:** Transformed voice has artifacts

**Solutions:**
1. Increase buffer size (try 250ms)
2. Reduce background noise
3. Speak more clearly and consistently
4. Try a different voice preset

### High Delay (>500ms)

**Symptoms:** Conversation feels laggy

**Solutions:**
1. Use wired internet
2. Reduce buffer size to 150ms
3. Check server location (should be US East)
4. Consider upgrading server resources

### Voice Not Transforming

**Symptoms:** Hearing original voice

**Solutions:**
1. Check ElevenLabs status dot
2. Verify API key is valid
3. Check if you have API credits remaining
4. Check server logs for ElevenLabs errors

### Call Drops

**Symptoms:** Call disconnects unexpectedly

**Solutions:**
1. Check internet stability
2. Look for errors in server logs
3. Verify Twilio account has credit
4. Check for rate limiting

---

## Privacy & Security

### What Data is Processed

- **Audio**: Streamed in real-time, not stored
- **Phone Numbers**: Logged for debugging (can be disabled)
- **Call Duration**: Tracked for billing

### Data Flow

```
Your Phone → Twilio → Your Server → ElevenLabs → Your Server → Twilio → Recipient
```

- Audio is processed but not stored by default
- ElevenLabs sees audio snippets for transformation
- Twilio sees call metadata

### Best Practices

1. **Use for legitimate purposes only**
2. **Inform recipients** if required by law
3. **Don't use for fraud or impersonation**
4. **Review local laws** about call recording

---

## FAQ

**Q: Can I use this for prank calls?**
A: We don't recommend it. Be respectful and legal.

**Q: Does the recipient know my voice is changed?**
A: Not unless you tell them. The voice sounds natural.

**Q: Can I record the calls?**
A: Not currently implemented. Twilio offers recording if needed.

**Q: What if I run out of ElevenLabs credits?**
A: Voice transformation stops; calls pass through unchanged.

**Q: Can I add custom voices?**
A: Yes! Clone a voice in ElevenLabs and add the ID to your config.

---

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review server logs: `railway logs` or check your hosting dashboard
3. Test the audio pipeline: `npm test`
4. Ask Zeke for help!
