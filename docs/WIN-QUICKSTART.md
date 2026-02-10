# 🎭 Voice Changer Phone - Win's Setup Guide

## Deploy in 15 Minutes (From Any Device!)

You'll need:
- A web browser
- A credit card (for ~$12/month)
- 15 minutes

---

## Step 1: Create ElevenLabs Account (5 min)

1. **Open** https://elevenlabs.io
2. **Click** "Get Started" → Sign up with Google/email
3. **Go to** Settings (gear icon) → Subscription
4. **Choose** Starter plan → **$5/month**
5. **Go to** Settings → API Keys
6. **Click** "Create API Key"
7. **Copy** the key (starts with `sk_...`)

📝 **Save this:** `ELEVENLABS_API_KEY = sk_xxxxxxxx`

---

## Step 2: Create Twilio Account (5 min)

1. **Open** https://www.twilio.com/try-twilio
2. **Sign up** and verify your email + phone
3. **From the Dashboard**, find and copy:
   - **Account SID** (starts with `AC`)
   - **Auth Token** (click eye icon to reveal)

📝 **Save these:**
```
TWILIO_ACCOUNT_SID = ACxxxxxxxx
TWILIO_AUTH_TOKEN = xxxxxxxx
```

4. **Go to** Phone Numbers → Manage → Buy a Number
5. **Pick** any US number with Voice capability
6. **Click** Buy ($1.15/month)
7. **Copy** the number

📝 **Save this:** `TWILIO_PHONE_NUMBER = +1xxxxxxxxxx`

### ⚠️ Trial Account Note
With a trial account, you can only call **verified numbers**. Add your own phone:
- Go to **Console** → **Verified Caller IDs**
- Add your mobile number
- Verify via SMS

---

## Step 3: Deploy to Railway (3 min)

1. **Click this link:** https://railway.app/new?repo=https://github.com/zekeforwin-droid/voice-changer-phone
   - Or open the GitHub repo and click the purple "Deploy on Railway" button
3. **Sign in** with GitHub (create account if needed)
4. **Fill in** the environment variables:

| Variable | Your Value |
|----------|------------|
| `TWILIO_ACCOUNT_SID` | ACxxxxxxxx (from Step 2) |
| `TWILIO_AUTH_TOKEN` | xxxxxxxx (from Step 2) |
| `TWILIO_PHONE_NUMBER` | +1xxxxxxxxxx (from Step 2) |
| `ELEVENLABS_API_KEY` | sk_xxxxxxxx (from Step 1) |

5. **Click** Deploy → Wait 2 minutes

6. **After deploy**, go to **Settings** → **Domains**
7. **Click** "Generate Domain"
8. **Copy** your URL (e.g., `voice-changer-abc123.up.railway.app`)

9. **Go back to** Variables → Add:
   - `SERVER_URL` = `https://voice-changer-abc123.up.railway.app` (your URL, no trailing slash!)

10. Railway will **redeploy** automatically

---

## Step 4: Connect Twilio Webhook (2 min)

1. **Open** https://console.twilio.com
2. **Go to** Phone Numbers → Manage → Active Numbers
3. **Click** your phone number
4. **Scroll to** "Voice & Fax" section
5. **Set** "A call comes in":
   - **Webhook**
   - URL: `https://YOUR-RAILWAY-URL/voice`
   - HTTP POST
6. **Click** Save

---

## ✅ You're Done! Test It!

1. **Open** your Railway URL in any browser
2. **Check** all 3 status dots are green ✅
3. **Enter** a phone number (your verified number for trial)
4. **Pick** a voice (try "Deep Male" first)
5. **Click** "Start Call"
6. **Answer** your phone
7. **Speak** and listen to your transformed voice!

---

## 📱 Bookmark Your Voice Changer

Your Railway URL works on:
- 💻 Any computer
- 📱 Phone browser
- 🌐 Any device with internet

**Bookmark it** for easy access!

---

## 💰 Monthly Costs

| Service | Cost |
|---------|------|
| ElevenLabs Starter | $5 |
| Twilio Phone | $1.15 |
| Twilio Calls (~3 hrs) | ~$3 |
| Railway | $5 |
| **Total** | **~$14** |

---

## ❓ Quick Troubleshooting

**Red dot on Twilio?**
→ Check Account SID starts with `AC`, Auth Token is correct

**Red dot on ElevenLabs?**
→ Check API key starts with `sk_`, you have an active subscription

**Call doesn't ring?**
→ For trial: destination must be in Verified Caller IDs

**Voice not changing?**
→ Check ElevenLabs has credits (Settings → Usage)

**Need help?**
→ Ask Zeke!

---

## 🎭 Voice Options

| For a... | Use |
|----------|-----|
| Authoritative tone | Deep Male (Adam) |
| Casual conversation | Young Male (Josh) |
| International flair | British Male (Harry) |
| Professional | Professional Female (Rachel) |
| Warm & friendly | Warm Female (Domi) |
| Mysterious | Mysterious (Arnold) |

---

Enjoy your voice changer! 🎭📞
