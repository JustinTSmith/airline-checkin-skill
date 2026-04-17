# Airline Check-in with Playwright Setup

This version uses Playwright for browser automation instead of Claude in Chrome, making it portable to any machine.

## Prerequisites

- Node.js 16+ installed
- macOS, Linux, or Windows (with WSL for scheduling)

## Installation

### 1. Install Playwright

```bash
npm install -g playwright
npx playwright install chromium
```

This downloads the Chromium browser that Playwright will use for automation.

### 2. Install the skill

```bash
# Copy skill files
cp -r airline-checkin-skill ~/.openclaw/skills/user/airline-checkin/
cd ~/.openclaw/skills/user/airline-checkin/

# Install dependencies
npm install playwright
```

### 3. Set up Telegram notifications (optional)

Add to `~/.zshrc`:

```bash
export TELEGRAM_BOT_TOKEN="your-bot-token"
export TELEGRAM_CHAT_ID="your-chat-id"
```

Reload:
```bash
source ~/.zshrc
```

## How it works

### Playwright automation flow

1. **24 hours before departure**, the LaunchAgent triggers
2. **Playwright launches** a Chromium browser (headless or visible)
3. **Navigates** to airline check-in page
4. **Finds and fills** PNR and last name fields using smart selectors
5. **Submits** the form
6. **Handles** seat selection if needed
7. **Downloads** boarding pass PDF
8. **Takes screenshots** at each step for debugging
9. **Sends Telegram notification** with result

### Smart field detection

The script tries multiple selector patterns for each field:

**For PNR/Confirmation:**
- `input[name*="confirmation"]`
- `input[placeholder*="booking"]`
- `input[id*="pnr"]`
- And more...

**For Last Name:**
- `input[name*="lastname"]`
- `input[placeholder*="surname"]`
- `input[id*="lastname"]`
- And more...

This works across different airline websites without hardcoding selectors.

## Usage

### Schedule a check-in

```javascript
const { scheduleFlight } = require('./checkin.js');

scheduleFlight({
  airline: 'Air Canada',
  pnr: 'ABC123',
  lastName: 'Smith',
  departureTime: '2026-03-28T06:30:00-05:00', // ISO 8601
  timezone: 'EST',
  seatPreference: 'window', // optional
  checkinUrl: 'https://www.aircanada.com/ca/en/aco/home/book/check-in.html' // optional, auto-detected if omitted
});
```

### Via OpenClaw/Claude

Just tell Claude:

"Schedule check-in for my Air Canada flight, PNR ABC123, last name Smith, departing March 28 at 6:30 AM EST, window seat preferred"

### List scheduled flights

```bash
node ~/.openclaw/skills/user/airline-checkin/checkin.js --list
```

### Cancel a check-in

```bash
node ~/.openclaw/skills/user/airline-checkin/checkin.js --cancel ABC123
```

## Configuration

### Headless mode (for production)

Edit `checkin.js`, find this line:

```javascript
const browser = await chromium.launch({ 
  headless: false, // Change to true for headless
  slowMo: 100
});
```

Change to:

```javascript
const browser = await chromium.launch({ 
  headless: true,
  slowMo: 0
});
```

### Browser slowdown

For debugging, keep `slowMo: 100` so you can watch what's happening. For production, set to `0`.

### Screenshots

Screenshots are automatically saved to `~/Downloads/boarding-passes/`:
- `{flight-id}-before-submit.png` - Before clicking submit
- `{flight-id}-seat-selection.png` - Seat selection page (if detected)
- `{flight-id}-complete.png` - Final confirmation page

## Debugging

### Watch it run

Keep `headless: false` to see the browser in action:

```javascript
const browser = await chromium.launch({ 
  headless: false,
  slowMo: 500  // Even slower for debugging
});
```

### Check logs

```bash
# Execution log
cat ~/.openclaw/flights/checkin-{flight-id}.log

# Error log
cat ~/.openclaw/flights/checkin-{flight-id}.error.log

# History
cat ~/.openclaw/flights/history.json
```

### Test manually

```bash
# Execute a specific flight ID immediately (don't wait for scheduled time)
node ~/.openclaw/skills/user/airline-checkin/checkin.js --execute {flight-id}
```

## Error handling

### CAPTCHA detected

If Playwright encounters a CAPTCHA:

1. Check-in is paused
2. You get a Telegram notification: "CAPTCHA detected - manual intervention required"
3. The browser stays open (if `headless: false`)
4. Complete the CAPTCHA manually
5. The script will continue

### Field not found

If the script can't find a field:

1. Check screenshots in `~/Downloads/boarding-passes/`
2. Inspect the page source
3. Add new selectors to the appropriate array in `checkin.js`

Example - adding a new PNR selector:

```javascript
const pnrSelectors = [
  'input[name*="confirmation" i]',
  'input[name*="booking" i]',
  'input[name*="reference" i]',
  'input[data-testid="confirmation-input"]', // Add new selector here
  // ... rest of selectors
];
```

### Check-in window not open

Some airlines don't open check-in exactly at the 24-hour mark. The script handles this by:

1. Attempting check-in
2. If it fails, waiting 10 seconds
3. Retrying up to 12 times (2 minutes total)

## Platform differences

### macOS

Uses LaunchAgents for scheduling. Works out of the box.

### Linux

Replace LaunchAgent logic with systemd timers:

```bash
# Create timer unit
sudo nano /etc/systemd/system/flight-checkin@.timer

[Unit]
Description=Flight check-in timer for %i

[Timer]
OnCalendar=2026-03-27 06:30:00
Persistent=true

[Install]
WantedBy=timers.target
```

### Windows (WSL)

Use Windows Task Scheduler or WSL cron:

```bash
crontab -e

# Add entry:
30 6 27 3 * node /path/to/checkin.js --execute {flight-id}
```

## Advanced features

### Multi-passenger bookings

For family bookings with multiple passengers:

```javascript
scheduleFlight({
  airline: 'Air Canada',
  pnr: 'ABC123',
  lastName: 'Smith',
  departureTime: '2026-03-28T06:30:00-05:00',
  passengers: ['John Smith', 'Jane Smith', 'Kid Smith'], // Optional
  selectAllPassengers: true
});
```

### Airline-specific customization

For airlines with unique flows, add custom logic:

```javascript
// In executeCheckin function, after successful login:

if (flight.airline.toLowerCase() === 'southwest') {
  // Southwest-specific: select boarding position
  const positions = await page.locator('.boarding-position').all();
  if (positions.length > 0) {
    await positions[0].click(); // Select first available
  }
}
```

### Email notifications

Add email support alongside Telegram:

```javascript
const nodemailer = require('nodemailer');

function sendEmailNotification(subject, body) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  
  transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER,
    subject: `✈️ ${subject}`,
    text: body
  });
}
```

## Troubleshooting

### "Playwright not found"

```bash
npm install -g playwright
npx playwright install
```

### "Browser closed unexpectedly"

Check system resources. Playwright needs:
- ~200MB RAM
- ~100MB disk for Chromium

### "Timeout waiting for selector"

The airline changed their page structure. Add new selectors or increase timeout:

```javascript
await field.isVisible({ timeout: 5000 }); // Increase from 1000 to 5000
```

### LaunchAgent not triggering

```bash
# Verify it's loaded
launchctl list | grep openclaw.checkin

# Check system log
log show --predicate 'subsystem == "com.apple.launchd"' --last 1h
```

## Performance

- **Headless mode:** ~3-5 seconds per check-in
- **Headful mode:** ~5-10 seconds per check-in
- **Memory:** ~150MB per browser instance
- **CPU:** Minimal (2-5% spike during execution)

## Security

- Browser runs in isolated context
- No credentials stored (only PNR + last name)
- All data stays local
- Telegram token in environment variable (not in code)
- Screenshots can be disabled if privacy is a concern

## Next steps

1. **Test with a real flight** (set to headless: false first)
2. **Monitor the first execution** via screenshots
3. **Switch to headless: true** for production
4. **Set up email alerts** as backup notification
5. **Add more airlines** to the URL mapping

Want me to add support for a specific airline or build the Gmail auto-detection feature?
