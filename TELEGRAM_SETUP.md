# Airline Check-in + Telegram Integration Guide

## Quick Setup

You already have a Telegram bot from your voice notes setup! Just add these environment variables and you're done.

### Step 1: Add Telegram credentials to your environment

Edit your `~/.zshrc`:

```bash
nano ~/.zshrc
```

Add these lines (use the SAME bot token and chat ID from your voice notes setup):

```bash
export TELEGRAM_BOT_TOKEN="your-bot-token-here"
export TELEGRAM_CHAT_ID="your-chat-id-here"
```

Save and reload:

```bash
source ~/.zshrc
```

### Step 2: Verify it works

Test the notification system:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage?chat_id=$TELEGRAM_CHAT_ID&text=✈️ Test from airline check-in skill"
```

You should receive a message in your Telegram chat!

### Step 3: Install the skill

```bash
# Copy the skill files
cp -r airline-checkin-skill ~/.openclaw/skills/user/airline-checkin/

# Make executable
chmod +x ~/.openclaw/skills/user/airline-checkin/checkin.js

# Test
node ~/.openclaw/skills/user/airline-checkin/checkin.js --list
```

## How It Works Together

The airline check-in skill **automatically sends to Telegram** - just like your voice notes!

**Same bot, different workflows:**

| Voice Notes | Flight Check-in |
|-------------|-----------------|
| Apple Watch → iCloud | Gmail confirmation → Scheduled job |
| Whisper transcription | Claude in Chrome automation |
| Categorize → Telegram | Download boarding pass → Telegram |
| Append to capture.md | Log to history.json |

Both use **the same Telegram credentials** you already configured!

## Full Example

**April 1 (booking day):**

You: "I just booked an Air Canada flight, check my email for confirmation"

Claude: *[searches Gmail]* "Found it! AC789, YYZ→YVR, April 5 at 8 AM. Schedule auto check-in?"

You: "Yes, window seat"

Claude: "✓ Scheduled for April 4 at 8:00 AM"

**April 4 at 8:00 AM (check-in time):**

*Telegram notification appears:*
```
✈️ Check-in Started

Flight: Air Canada AC789
PNR: XYZ123
```

*2 minutes later:*
```
✅ Check-in Complete

Flight: AC789
Seat: 14A (Window)
Boarding pass ready
```

**April 5 (flight day):**

You show up with boarding pass already in Telegram. Done.

## Why This Integration Is Perfect

1. **One bot for everything** - Voice notes AND flight check-ins
2. **Mobile-first** - All notifications on your phone
3. **Zero manual work** - Completely automated
4. **Local processing** - Privacy-preserving like your voice notes
5. **Same setup** - No new accounts or tokens needed

The airline check-in skill is basically **your voice notes system for flights** - same philosophy, same tools, same Telegram bot!
