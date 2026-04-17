---
name: airline-checkin
description: Automatically check in to flights 24 hours before departure using Claude in Chrome. Works with Air Canada, United, Delta, Southwest, and any airline with online check-in.
triggers:
  - schedule check-in
  - auto check-in
  - flight check-in
  - check me in for flight
  - add flight to auto check-in
  - schedule my flight
version: 1.0.0
author: OpenClaw
---

# Airline Auto Check-in Skill

## Overview
Automates airline check-in at exactly 24 hours before flight departure using Claude in Chrome browser automation. Works with any airline including Air Canada, United, Delta, Southwest, etc.

## How it works
1. You provide flight details (PNR/booking reference, last name, departure time)
2. Skill calculates check-in time (24 hours before departure)
3. Schedules a job to run at that exact time
4. Uses Claude in Chrome to navigate the airline's check-in flow
5. Handles form filling, seat selection, and downloads boarding pass
6. Notifies you when complete

## Usage

### Schedule a flight check-in

"Schedule check-in for my Air Canada flight AC123, PNR ABC123, last name Smith, departing March 25 at 8:30 AM EST"

"Add my United flight to auto check-in: confirmation XYZ789, name Johnson, leaves tomorrow at 2:15 PM PST"

"Check me into Southwest flight 1234, conf WN5678, last name Davis, March 28 6:00 AM CST"

### Auto-detect flights from Gmail

"Check my email for flight bookings and schedule check-ins"

"Scan my Gmail for upcoming flights and auto-schedule them"

"Find any flight confirmations in my email and set up auto check-in"

### Check scheduled check-ins

"Show me my upcoming auto check-ins"

"List all scheduled flight check-ins"

### Cancel a check-in

"Cancel the check-in for flight AC123"

"Remove my March 25th check-in"

## What you need to provide

**Required:**
- Airline name (e.g., "Air Canada", "United", "Southwest")
- PNR/Booking reference/Confirmation code (6-character code like "ABC123")
- Last name (as it appears on booking)
- Departure date and time
- Timezone (EST, PST, CST, etc.)

**Optional:**
- Seat preference (window/aisle/specific seat number)
- Email to send boarding pass to
- Check-in URL (if non-standard)

## Supported airlines

Works with any airline that offers online check-in:
- Air Canada
- United Airlines
- Delta Air Lines
- Southwest Airlines
- American Airlines
- WestJet
- Alaska Airlines
- JetBlue
- And many more...

## Technical details

### Check-in timing
- Schedules job for exactly 24 hours before departure
- Adds 5-second buffer to ensure check-in window is open
- Retries every 10 seconds for up to 2 minutes if check-in not available yet

### Browser automation
- Uses Claude in Chrome for intelligent form navigation
- Handles dynamic forms, pop-ups, and CAPTCHA prompts
- Can select seats based on your preference
- Downloads boarding pass automatically

### Data storage
- Stores flight details in `~/.openclaw/flights/scheduled.json`
- Completed check-ins logged to `~/.openclaw/flights/history.json`
- Boarding passes saved to `~/Downloads/boarding-passes/`

### Notifications
- macOS notification when check-in starts
- Success/failure notification with boarding pass link
- Optional email notification

## Example conversation

**You:** "Schedule check-in for my Air Canada flight, PNR is DEF456, last name Wilson, departing March 22 at 10:45 AM EST from Toronto to Vancouver"

**Claude:** "I've scheduled your Air Canada check-in:
- Flight: DEF456
- Passenger: Wilson
- Departure: March 22, 2026 at 10:45 AM EST
- Check-in scheduled for: March 21, 2026 at 10:45 AM EST (24 hours before)
- Route: YYZ → YVR

You'll receive a notification when check-in is complete. Would you like to specify a seat preference?"

**You:** "Yes, window seat please"

**Claude:** "Updated. I'll request a window seat during check-in."

---

## Limitations

- Requires macOS with OpenClaw and Claude in Chrome
- Cannot bypass CAPTCHA or "prove you're human" checks (will notify you to complete manually)
- Some airlines require passport info or additional verification - Claude will handle what it can and notify you of anything that needs manual input
- Group bookings (10+ passengers) may have restrictions
- Special assistance requests may require airport check-in

## Privacy & Security

- Flight data stored locally on your Mac only
- No data sent to third parties
- PNR/confirmation codes encrypted at rest
- Can delete all flight data anytime with "clear all check-in data"

## Troubleshooting

**Check-in failed:**
- Verify PNR and last name are correct
- Check that online check-in is available for your flight
- Some routes (Cuba, Algeria, Morocco on Air Canada) require airport check-in

**Time zone issues:**
- Always specify timezone (EST, PST, etc.)
- Departure time should be in LOCAL airport time

**Boarding pass not downloaded:**
- Check `~/Downloads/boarding-passes/` folder
- Some airlines email instead of download - check your email

**Scheduled check-in not running:**
- Ensure your Mac is awake and OpenClaw is running
- Check "Show scheduled check-ins" to verify it was added

## Commands reference

- "Schedule check-in for [airline] flight [details]"
- "Show my upcoming check-ins"
- "Cancel check-in for [flight]"
- "Update seat preference for [flight] to [preference]"
- "Clear all check-in data"
- "Show check-in history"
