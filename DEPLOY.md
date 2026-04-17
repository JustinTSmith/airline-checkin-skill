# Airline Check-in Skill Deployment

## Quick Install

```bash
# 1. Extract the package
tar -xzf airline-checkin_*.tar.gz
cd airline-checkin

# 2. Run installation script
./install.sh

# 3. Set up Telegram (optional but recommended)
echo 'export TELEGRAM_BOT_TOKEN="your-token"' >> ~/.zshrc
echo 'export TELEGRAM_CHAT_ID="your-chat-id"' >> ~/.zshrc
source ~/.zshrc

# 4. Test
node ~/.openclaw/skills/user/airline-checkin/checkin.js --list
```

## What Gets Installed

- **Skill files:** `~/.openclaw/skills/user/airline-checkin/`
- **Flight data:** `~/.openclaw/flights/`
- **Boarding passes:** `~/Downloads/boarding-passes/`
- **Dependencies:** Playwright + Chromium browser

## Requirements

- **Node.js 16+** (check with `node --version`)
- **npm** (comes with Node.js)
- **macOS, Linux, or Windows with WSL**

## Configuration

### Telegram Notifications

Get your bot token and chat ID from your existing Telegram bot, then:

```bash
export TELEGRAM_BOT_TOKEN="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
export TELEGRAM_CHAT_ID="123456789"
```

### Gmail Auto-Detection

Requires Gmail integration in OpenClaw. Just tell Claude:

"Check my email for flight bookings and schedule check-ins"

## Usage

### Schedule a flight manually

Tell Claude in OpenClaw:

"Schedule check-in for my Air Canada flight, PNR ABC123, last name Smith, departing March 28 at 6:30 AM EST"

### Auto-detect from Gmail

"Scan my Gmail for upcoming flights"

### Check scheduled flights

"Show my upcoming check-ins"

### Cancel a check-in

"Cancel check-in for flight ABC123"

## Files Included

- `SKILL.md` - Skill definition for OpenClaw
- `checkin.js` - Main check-in automation script
- `gmail-watcher.js` - Gmail flight detection
- `package.json` - Node.js dependencies
- `install.sh` - Installation script
- `README.md` - Full documentation
- `PLAYWRIGHT_SETUP.md` - Playwright configuration guide
- `TELEGRAM_SETUP.md` - Telegram integration guide

## Troubleshooting

### npm not found

Install Node.js: https://nodejs.org/

### Chromium won't install

```bash
npx playwright install chromium --with-deps
```

### Skill not triggering

Verify installation:
```bash
ls ~/.openclaw/skills/user/airline-checkin/SKILL.md
```

### Check-in not running

View logs:
```bash
cat ~/.openclaw/flights/checkin-*.log
```

## Support

Full documentation in the extracted files:
- README.md
- PLAYWRIGHT_SETUP.md  
- TELEGRAM_SETUP.md
