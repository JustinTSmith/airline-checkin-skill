# Airline Auto Check-in Skill for OpenClaw

Automatically check in to flights 24 hours before departure using Claude in Chrome browser automation.

## Installation

1. **Copy skill to OpenClaw skills directory:**

```bash
cp -r airline-checkin-skill ~/.openclaw/skills/user/airline-checkin/
```

2. **Make the script executable:**

```bash
chmod +x ~/.openclaw/skills/user/airline-checkin/checkin.js
```

3. **Ensure Claude in Chrome is connected to OpenClaw**

4. **Verify installation:**

```bash
node ~/.openclaw/skills/user/airline-checkin/checkin.js --list
```

## Quick Start

### Schedule a check-in via OpenClaw

Talk to Claude in OpenClaw:

> "Schedule check-in for my Air Canada flight AC789, confirmation DEF456, last name Wilson, departing March 25 at 10:45 AM EST"

Claude will:
1. Parse your flight details
2. Calculate the 24-hour check-in time
3. Schedule a launchd job
4. Confirm the scheduling

### Check your scheduled flights

> "Show my upcoming flight check-ins"

### Cancel a check-in

> "Cancel the check-in for flight DEF456"

## Manual Usage (via CLI)

### Schedule a flight manually

```javascript
const { scheduleFlight } = require('~/.openclaw/skills/user/airline-checkin/checkin.js');

scheduleFlight({
  airline: 'Air Canada',
  pnr: 'ABC123',
  lastName: 'Smith',
  departureTime: '2026-03-25T10:45:00-05:00', // ISO 8601 format with timezone
  timezone: 'EST',
  seatPreference: 'window', // optional
  email: 'you@example.com' // optional
});
```

### List scheduled check-ins

```bash
node ~/.openclaw/skills/user/airline-checkin/checkin.js --list
```

### Cancel a check-in

```bash
node ~/.openclaw/skills/user/airline-checkin/checkin.js --cancel ABC123
```

## How It Works

### Scheduling
1. Flight details are stored in `~/.openclaw/flights/scheduled.json`
2. A macOS LaunchAgent is created at `~/Library/LaunchAgents/ai.openclaw.checkin.<flight-id>.plist`
3. The job triggers at exactly 24 hours before departure

### Execution
1. LaunchAgent triggers the check-in script
2. Script sends a prompt to Claude in Chrome via OpenClaw
3. Claude navigates to airline's check-in page
4. Fills in PNR and last name
5. Completes check-in flow
6. Downloads boarding pass to `~/Downloads/boarding-passes/`
7. Sends macOS notification with result

### Data Storage

```
~/.openclaw/flights/
├── scheduled.json       # Upcoming check-ins
├── history.json         # Completed check-ins
├── checkin-*.log       # Execution logs
└── checkin-*.error.log # Error logs
```

## Supported Airlines

Works with any airline offering online check-in. Pre-configured URLs for:

- Air Canada
- United Airlines
- Delta Air Lines
- Southwest Airlines
- American Airlines
- WestJet
- Alaska Airlines
- JetBlue

For other airlines, provide the check-in URL when scheduling.

## Examples

### Air Canada

```
"Schedule my Air Canada flight:
- PNR: XYZ789
- Last name: Thompson
- Departing: March 28, 2026 at 6:30 AM EST
- Preference: aisle seat"
```

### Southwest (custom URL)

```javascript
scheduleFlight({
  airline: 'Southwest',
  pnr: 'AB12CD',
  lastName: 'Martinez',
  departureTime: '2026-04-01T14:15:00-07:00',
  timezone: 'PST',
  checkinUrl: 'https://www.southwest.com/air/check-in/'
});
```

### International flight

```
"Check in for my United flight to London:
- Confirmation: UNT456
- Name: Chen
- Leaves April 5th at 8:00 PM EDT
- Window seat please"
```

## Troubleshooting

### Check-in didn't run

**Verify the LaunchAgent is loaded:**
```bash
launchctl list | grep openclaw.checkin
```

**Check logs:**
```bash
cat ~/.openclaw/flights/checkin-<flight-id>.log
```

**Ensure your Mac is awake:**
LaunchAgents require the Mac to be powered on. For overnight flights, keep your Mac awake or use a power schedule.

### Check-in failed

Common reasons:
- PNR or last name incorrect
- Check-in window not yet open (some airlines open slightly after 24hr mark)
- Airline requires passport info
- Special assistance needed
- Route requires airport check-in

Check `~/.openclaw/flights/history.json` for the error message.

### Time zone issues

Always provide departure time in **local airport time** with the correct timezone abbreviation (EST, PST, CST, MST, etc.).

**Example:**
- Flight departs Toronto at 10:45 AM local → use `EST` or `EDT` depending on season
- Flight departs Vancouver at 6:30 PM local → use `PST` or `PDT`

### Boarding pass not downloaded

Some airlines:
- Email boarding passes instead of downloading
- Require you to print at airport
- Use mobile-only boarding passes

Check your email and the airline's app.

## Limitations

- **macOS only** (uses LaunchAgents for scheduling)
- **Requires Mac to be awake** at check-in time
- **Cannot bypass CAPTCHA** (will notify you to complete manually)
- **Some airlines block automation** (will notify you)
- **Special requests require airport check-in** (wheelchair, unaccompanied minor, pet, etc.)

## Privacy & Security

- All data stored locally on your Mac
- No cloud sync or third-party transmission
- LaunchAgents run under your user account
- Flight data deleted from `scheduled.json` after check-in completes
- History retained in `history.json` (can be cleared manually)

## Uninstallation

### Remove all scheduled check-ins

```bash
# Cancel all flights
node ~/.openclaw/skills/user/airline-checkin/checkin.js --list
# Note each PNR, then cancel:
node ~/.openclaw/skills/user/airline-checkin/checkin.js --cancel <PNR>

# Or manually remove LaunchAgents:
rm ~/Library/LaunchAgents/ai.openclaw.checkin.*.plist
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/ai.openclaw.checkin.*.plist
```

### Remove data

```bash
rm -rf ~/.openclaw/flights/
```

### Remove skill

```bash
rm -rf ~/.openclaw/skills/user/airline-checkin/
```

## Support

For issues or feature requests, check:
- `~/.openclaw/flights/checkin-*.log` for execution logs
- `~/.openclaw/flights/history.json` for past results
- OpenClaw documentation for Claude in Chrome setup

## License

MIT - use at your own risk. Always verify check-in was successful before heading to the airport.
