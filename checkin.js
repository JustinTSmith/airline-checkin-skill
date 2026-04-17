#!/usr/bin/env node

/**
 * Airline Auto Check-in Implementation
 * 
 * Manages flight check-in scheduling and execution using Claude in Chrome
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Paths
const OPENCLAW_DIR = path.join(process.env.HOME, '.openclaw', 'flights');
const SCHEDULED_FILE = path.join(OPENCLAW_DIR, 'scheduled.json');
const HISTORY_FILE = path.join(OPENCLAW_DIR, 'history.json');
const BOARDING_PASS_DIR = path.join(process.env.HOME, 'Downloads', 'boarding-passes');

// Ensure directories exist
[OPENCLAW_DIR, BOARDING_PASS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * Airline check-in URLs by carrier
 */
const AIRLINE_CHECKIN_URLS = {
  'air canada': 'https://www.aircanada.com/ca/en/aco/home/book/check-in.html',
  'united': 'https://www.united.com/en/us/checkin',
  'delta': 'https://www.delta.com/checkin',
  'southwest': 'https://www.southwest.com/air/check-in/',
  'american': 'https://www.aa.com/reservation/flightCheckInViewReservationsAccess.do',
  'westjet': 'https://www.westjet.com/en-ca/check-in',
  'alaska': 'https://www.alaskaair.com/check-in',
  'jetblue': 'https://www.jetblue.com/check-in'
};

/**
 * Flight class with check-in scheduling logic
 */
class Flight {
  constructor(data) {
    this.id = data.id || generateFlightId();
    this.airline = data.airline.toLowerCase();
    this.pnr = data.pnr.toUpperCase();
    this.lastName = data.lastName;
    this.departureTime = new Date(data.departureTime);
    this.timezone = data.timezone;
    this.seatPreference = data.seatPreference || null;
    this.email = data.email || null;
    this.checkinUrl = data.checkinUrl || AIRLINE_CHECKIN_URLS[this.airline];
    this.status = 'scheduled';
    this.createdAt = new Date();
  }

  getCheckinTime() {
    // 24 hours before departure
    const checkinTime = new Date(this.departureTime);
    checkinTime.setHours(checkinTime.getHours() - 24);
    return checkinTime;
  }

  getTimeUntilCheckin() {
    const now = new Date();
    const checkinTime = this.getCheckinTime();
    return checkinTime - now;
  }

  isReady() {
    return this.getTimeUntilCheckin() <= 0;
  }

  toJSON() {
    return {
      id: this.id,
      airline: this.airline,
      pnr: this.pnr,
      lastName: this.lastName,
      departureTime: this.departureTime.toISOString(),
      timezone: this.timezone,
      seatPreference: this.seatPreference,
      email: this.email,
      checkinUrl: this.checkinUrl,
      status: this.status,
      createdAt: this.createdAt.toISOString()
    };
  }
}

/**
 * Load scheduled flights
 */
function loadScheduled() {
  if (!fs.existsSync(SCHEDULED_FILE)) {
    return [];
  }
  const data = JSON.parse(fs.readFileSync(SCHEDULED_FILE, 'utf8'));
  return data.map(f => new Flight(f));
}

/**
 * Save scheduled flights
 */
function saveScheduled(flights) {
  fs.writeFileSync(SCHEDULED_FILE, JSON.stringify(flights.map(f => f.toJSON()), null, 2));
}

/**
 * Add flight to schedule
 */
function scheduleFlight(flightData) {
  const flights = loadScheduled();
  const flight = new Flight(flightData);
  
  // Check for duplicates
  const existing = flights.find(f => f.pnr === flight.pnr && f.lastName === flight.lastName);
  if (existing) {
    throw new Error(`Flight ${flight.pnr} for ${flight.lastName} is already scheduled`);
  }
  
  flights.push(flight);
  saveScheduled(flights);
  
  // Schedule the job
  scheduleCheckinJob(flight);
  
  return flight;
}

/**
 * Schedule a check-in job using launchd (macOS)
 */
function scheduleCheckinJob(flight) {
  const checkinTime = flight.getCheckinTime();
  const plistPath = path.join(process.env.HOME, 'Library', 'LaunchAgents', `ai.openclaw.checkin.${flight.id}.plist`);
  
  const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>ai.openclaw.checkin.${flight.id}</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>${__filename}</string>
        <string>--execute</string>
        <string>${flight.id}</string>
    </array>
    
    <key>StartCalendarInterval</key>
    <dict>
        <key>Year</key>
        <integer>${checkinTime.getFullYear()}</integer>
        <key>Month</key>
        <integer>${checkinTime.getMonth() + 1}</integer>
        <key>Day</key>
        <integer>${checkinTime.getDate()}</integer>
        <key>Hour</key>
        <integer>${checkinTime.getHours()}</integer>
        <key>Minute</key>
        <integer>${checkinTime.getMinutes()}</integer>
    </dict>
    
    <key>StandardOutPath</key>
    <string>${OPENCLAW_DIR}/checkin-${flight.id}.log</string>
    
    <key>StandardErrorPath</key>
    <string>${OPENCLAW_DIR}/checkin-${flight.id}.error.log</string>
</dict>
</plist>`;
  
  fs.writeFileSync(plistPath, plistContent);
  
  // Load the job
  spawn('launchctl', ['load', plistPath]);
  
  console.log(`Scheduled check-in job for ${flight.pnr} at ${checkinTime.toLocaleString()}`);
}

/**
 * Execute check-in for a flight using Playwright
 */
async function executeCheckin(flightId) {
  const flights = loadScheduled();
  const flight = flights.find(f => f.id === flightId);
  
  if (!flight) {
    throw new Error(`Flight ${flightId} not found`);
  }
  
  console.log(`Starting check-in for ${flight.airline} flight ${flight.pnr}...`);
  
  // Send notification
  sendNotification('Check-in Started', `Checking in for ${flight.airline} flight ${flight.pnr}`);
  
  try {
    // Import Playwright dynamically
    const { chromium } = require('playwright');
    
    // Launch browser
    const browser = await chromium.launch({ 
      headless: false, // Set to true for production
      slowMo: 100 // Slow down actions for visibility
    });
    
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });
    
    const page = await context.newPage();
    
    // Navigate to check-in page
    console.log(`Navigating to ${flight.checkinUrl}`);
    await page.goto(flight.checkinUrl, { waitUntil: 'networkidle' });
    
    // Wait a bit for dynamic content
    await page.waitForTimeout(2000);
    
    // Try to find and fill PNR/confirmation field
    const pnrSelectors = [
      'input[name*="confirmation" i]',
      'input[name*="booking" i]',
      'input[name*="reference" i]',
      'input[placeholder*="confirmation" i]',
      'input[placeholder*="booking" i]',
      'input[id*="confirmation" i]',
      'input[id*="booking" i]',
      'input[id*="pnr" i]'
    ];
    
    let pnrFilled = false;
    for (const selector of pnrSelectors) {
      try {
        const field = await page.locator(selector).first();
        if (await field.isVisible({ timeout: 1000 })) {
          await field.fill(flight.pnr);
          console.log(`Filled PNR: ${flight.pnr} using selector: ${selector}`);
          pnrFilled = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!pnrFilled) {
      throw new Error('Could not find PNR/confirmation input field');
    }
    
    // Try to find and fill last name field
    const nameSelectors = [
      'input[name*="lastname" i]',
      'input[name*="last" i]',
      'input[name*="surname" i]',
      'input[placeholder*="last name" i]',
      'input[placeholder*="surname" i]',
      'input[id*="lastname" i]',
      'input[id*="surname" i]'
    ];
    
    let nameFilled = false;
    for (const selector of nameSelectors) {
      try {
        const field = await page.locator(selector).first();
        if (await field.isVisible({ timeout: 1000 })) {
          await field.fill(flight.lastName);
          console.log(`Filled last name: ${flight.lastName} using selector: ${selector}`);
          nameFilled = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!nameFilled) {
      throw new Error('Could not find last name input field');
    }
    
    // Take screenshot before submit
    await page.screenshot({ 
      path: path.join(BOARDING_PASS_DIR, `${flight.id}-before-submit.png`) 
    });
    
    // Find and click submit button
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Continue")',
      'button:has-text("Next")',
      'button:has-text("Check in")',
      'button:has-text("Submit")',
      'input[type="submit"]',
      'a:has-text("Continue")'
    ];
    
    let submitted = false;
    for (const selector of submitSelectors) {
      try {
        const button = await page.locator(selector).first();
        if (await button.isVisible({ timeout: 1000 })) {
          await button.click();
          console.log(`Clicked submit using selector: ${selector}`);
          submitted = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!submitted) {
      throw new Error('Could not find submit button');
    }
    
    // Wait for navigation
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // Check for CAPTCHA or errors
    const pageContent = await page.content();
    if (pageContent.toLowerCase().includes('captcha') || 
        pageContent.toLowerCase().includes('recaptcha')) {
      throw new Error('CAPTCHA detected - manual intervention required');
    }
    
    // Look for seat selection (optional)
    if (flight.seatPreference) {
      try {
        const seatMap = await page.locator('.seat-map, [class*="seat"]').first();
        if (await seatMap.isVisible({ timeout: 5000 })) {
          console.log('Seat selection page detected');
          // This would need airline-specific logic
          // For now, just take a screenshot
          await page.screenshot({ 
            path: path.join(BOARDING_PASS_DIR, `${flight.id}-seat-selection.png`) 
          });
        }
      } catch (e) {
        console.log('No seat selection found, continuing...');
      }
    }
    
    // Look for boarding pass download
    try {
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
      
      const downloadSelectors = [
        'a:has-text("boarding pass")',
        'button:has-text("boarding pass")',
        'a:has-text("download")',
        'button:has-text("download")',
        '[href*=".pdf"]'
      ];
      
      for (const selector of downloadSelectors) {
        try {
          const downloadBtn = await page.locator(selector).first();
          if (await downloadBtn.isVisible({ timeout: 2000 })) {
            await downloadBtn.click();
            const download = await downloadPromise;
            const downloadPath = path.join(BOARDING_PASS_DIR, `${flight.pnr}-boarding-pass.pdf`);
            await download.saveAs(downloadPath);
            console.log(`Boarding pass downloaded to ${downloadPath}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
    } catch (e) {
      console.log('No boarding pass download found');
    }
    
    // Take final screenshot
    await page.screenshot({ 
      path: path.join(BOARDING_PASS_DIR, `${flight.id}-complete.png`),
      fullPage: true
    });
    
    // Close browser
    await browser.close();
    
    // Update flight status
    flight.status = 'completed';
    saveScheduled(flights);
    
    // Log to history
    logHistory(flight, 'success', 'Check-in completed successfully via Playwright');
    
    // Send success notification
    sendNotification('Check-in Complete', `Successfully checked in for ${flight.airline} flight ${flight.pnr}`);
    
  } catch (error) {
    console.error('Check-in failed:', error.message);
    
    // Log failure
    logHistory(flight, 'failed', error.message);
    
    // Send failure notification
    sendNotification('Check-in Failed', `${flight.airline} flight ${flight.pnr}: ${error.message}`);
    
    flight.status = 'failed';
    saveScheduled(flights);
  } finally {
    // Unload the launchd job
    const plistPath = path.join(process.env.HOME, 'Library', 'LaunchAgents', `ai.openclaw.checkin.${flight.id}.plist`);
    try {
      spawn('launchctl', ['unload', plistPath]);
      fs.unlinkSync(plistPath);
    } catch (e) {
      // Job may not exist
    }
  }
}

/**
 * Send notification via Telegram
 */
function sendNotification(title, message) {
  // Send to your Telegram bot/group
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.TELEGRAM_CHAT_ID;
  
  if (!telegramBotToken || !telegramChatId) {
    console.warn('Telegram credentials not set, falling back to macOS notification');
    const script = `display notification "${message}" with title "${title}"`;
    spawn('osascript', ['-e', script]);
    return;
  }
  
  const https = require('https');
  const data = JSON.stringify({
    chat_id: telegramChatId,
    text: `✈️ *${title}*\n\n${message}`,
    parse_mode: 'Markdown'
  });
  
  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${telegramBotToken}/sendMessage`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };
  
  const req = https.request(options, (res) => {
    console.log(`Telegram notification sent: ${res.statusCode}`);
  });
  
  req.on('error', (error) => {
    console.error('Error sending Telegram notification:', error);
  });
  
  req.write(data);
  req.end();
}

/**
 * Log check-in to history
 */
function logHistory(flight, result, message) {
  let history = [];
  if (fs.existsSync(HISTORY_FILE)) {
    history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
  }
  
  history.push({
    ...flight.toJSON(),
    result,
    message,
    completedAt: new Date().toISOString()
  });
  
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

/**
 * Generate unique flight ID
 */
function generateFlightId() {
  return `flight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * List scheduled check-ins
 */
function listScheduled() {
  const flights = loadScheduled();
  
  if (flights.length === 0) {
    console.log('No scheduled check-ins');
    return;
  }
  
  console.log('\nScheduled Check-ins:\n');
  flights.forEach(flight => {
    const checkinTime = flight.getCheckinTime();
    const timeUntil = flight.getTimeUntilCheckin();
    const hoursUntil = Math.floor(timeUntil / (1000 * 60 * 60));
    
    console.log(`${flight.airline.toUpperCase()} ${flight.pnr}`);
    console.log(`  Passenger: ${flight.lastName}`);
    console.log(`  Departure: ${flight.departureTime.toLocaleString()}`);
    console.log(`  Check-in: ${checkinTime.toLocaleString()}`);
    console.log(`  Time until check-in: ${hoursUntil} hours`);
    console.log(`  Status: ${flight.status}`);
    console.log('');
  });
}

/**
 * Cancel a scheduled check-in
 */
function cancelCheckin(pnrOrId) {
  const flights = loadScheduled();
  const index = flights.findIndex(f => f.pnr === pnrOrId.toUpperCase() || f.id === pnrOrId);
  
  if (index === -1) {
    throw new Error(`Flight ${pnrOrId} not found`);
  }
  
  const flight = flights[index];
  
  // Unload launchd job
  const plistPath = path.join(process.env.HOME, 'Library', 'LaunchAgents', `ai.openclaw.checkin.${flight.id}.plist`);
  if (fs.existsSync(plistPath)) {
    spawn('launchctl', ['unload', plistPath]);
    fs.unlinkSync(plistPath);
  }
  
  flights.splice(index, 1);
  saveScheduled(flights);
  
  console.log(`Cancelled check-in for ${flight.airline} flight ${flight.pnr}`);
}

// CLI handling
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    switch (command) {
      case '--execute':
        executeCheckin(args[1]);
        break;
      case '--list':
        listScheduled();
        break;
      case '--cancel':
        cancelCheckin(args[1]);
        break;
      default:
        console.log('Usage:');
        console.log('  --execute <flight-id>   Execute check-in for flight');
        console.log('  --list                  List scheduled check-ins');
        console.log('  --cancel <pnr-or-id>    Cancel a scheduled check-in');
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Export for use as module
module.exports = {
  scheduleFlight,
  executeCheckin,
  listScheduled,
  cancelCheckin,
  loadScheduled
};
