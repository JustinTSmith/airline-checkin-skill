#!/usr/bin/env node

/**
 * Gmail Flight Watcher
 * 
 * Monitors Gmail for flight confirmation emails and automatically schedules check-ins
 */

const { scheduleFlight } = require('./checkin.js');
const fs = require('fs');
const path = require('path');

// Paths
const STATE_FILE = path.join(process.env.HOME, '.openclaw', 'flights', 'processed-emails.json');

/**
 * Load list of already processed email IDs
 */
function loadProcessedEmails() {
  if (!fs.existsSync(STATE_FILE)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
}

/**
 * Save processed email ID
 */
function markEmailProcessed(messageId) {
  const processed = loadProcessedEmails();
  if (!processed.includes(messageId)) {
    processed.push(messageId);
    fs.writeFileSync(STATE_FILE, JSON.stringify(processed, null, 2));
  }
}

/**
 * Extract flight details from email content
 */
function extractFlightDetails(email) {
  const subject = email.headers.Subject || '';
  const body = email.body || '';
  const from = email.headers.From || '';
  
  // Combined text for searching
  const text = `${subject} ${body}`.toLowerCase();
  
  // Detect airline
  let airline = null;
  const airlinePatterns = {
    'air canada': /air\s*canada/i,
    'united': /united\s*airlines?/i,
    'delta': /delta\s*air/i,
    'southwest': /southwest\s*airlines?/i,
    'american': /american\s*airlines?/i,
    'westjet': /westjet/i,
    'alaska': /alaska\s*airlines?/i,
    'jetblue': /jetblue/i
  };
  
  for (const [name, pattern] of Object.entries(airlinePatterns)) {
    if (pattern.test(text) || pattern.test(from)) {
      airline = name;
      break;
    }
  }
  
  if (!airline) {
    console.log('No recognized airline found');
    return null;
  }
  
  // Extract PNR/Booking reference
  let pnr = null;
  const pnrPatterns = [
    /booking\s*reference:?\s*([A-Z0-9]{6})/i,
    /confirmation\s*(?:number|code)?:?\s*([A-Z0-9]{6})/i,
    /pnr:?\s*([A-Z0-9]{6})/i,
    /record\s*locator:?\s*([A-Z0-9]{6})/i,
    /reservation\s*code:?\s*([A-Z0-9]{6})/i
  ];
  
  for (const pattern of pnrPatterns) {
    const match = text.match(pattern);
    if (match) {
      pnr = match[1].toUpperCase();
      break;
    }
  }
  
  if (!pnr) {
    console.log('No PNR found');
    return null;
  }
  
  // Extract last name from email recipient or body
  // Try to find "Dear [FirstName] [LastName]" or similar
  let lastName = null;
  const namePatterns = [
    /dear\s+(\w+)\s+(\w+)/i,
    /hi\s+(\w+)\s+(\w+)/i,
    /hello\s+(\w+)\s+(\w+)/i,
    /(\w+)\s+(\w+),\s+your/i,
    /passenger:?\s+(\w+)\s+(\w+)/i
  ];
  
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match) {
      lastName = match[2]; // Second captured group is typically last name
      break;
    }
  }
  
  // Fallback: extract from "To" field if it's a name
  if (!lastName) {
    const to = email.headers.To || '';
    const nameMatch = to.match(/(\w+)\s+(\w+)/);
    if (nameMatch) {
      lastName = nameMatch[2];
    }
  }
  
  if (!lastName) {
    console.log('No last name found');
    return null;
  }
  
  // Extract departure date and time
  let departureTime = null;
  
  // Pattern: "March 28, 2026 at 6:30 AM" or "28 Mar 2026 06:30"
  const datePatterns = [
    /depart(?:ing|ure)?:?\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})\s+(?:at\s+)?(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i,
    /(\d{1,2}\s+[A-Za-z]+\s+\d{4})\s+(\d{1,2}:\d{2})/i,
    /(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/i
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      const dateStr = `${match[1]} ${match[2]}`;
      departureTime = new Date(dateStr);
      if (!isNaN(departureTime.getTime())) {
        break;
      }
    }
  }
  
  if (!departureTime) {
    console.log('No departure time found');
    return null;
  }
  
  // Extract timezone (look for airport codes or explicit timezone)
  let timezone = 'EST'; // Default
  const timezonePatterns = [
    /\b(EST|EDT|PST|PDT|CST|CDT|MST|MDT)\b/i,
    /\b(YYZ|YUL|YVR|YYC)\b/i // Toronto, Montreal, Vancouver, Calgary
  ];
  
  for (const pattern of timezonePatterns) {
    const match = text.match(pattern);
    if (match) {
      const code = match[1].toUpperCase();
      // Map airport codes to timezones
      const airportToTz = {
        'YYZ': 'EST', 'YUL': 'EST', 'YOW': 'EST',
        'YVR': 'PST', 'YYC': 'MST'
      };
      timezone = airportToTz[code] || code;
      break;
    }
  }
  
  return {
    airline,
    pnr,
    lastName,
    departureTime: departureTime.toISOString(),
    timezone,
    source: 'gmail',
    emailId: email.messageId
  };
}

/**
 * Search Gmail for flight confirmation emails
 */
async function searchFlightEmails(gmailSearchFn) {
  // Search for flight confirmations from last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateStr = thirtyDaysAgo.toISOString().split('T')[0].replace(/-/g, '/');
  
  const queries = [
    `(from:aircanada.com OR from:united.com OR from:delta.com OR from:southwest.com) (subject:confirmation OR subject:booking OR subject:itinerary) after:${dateStr}`,
    `subject:("flight confirmation" OR "booking confirmed" OR "your trip") after:${dateStr}`,
    `(booking reference OR confirmation code OR PNR) after:${dateStr}`
  ];
  
  const foundEmails = [];
  
  for (const query of queries) {
    try {
      const results = await gmailSearchFn({ q: query, maxResults: 20 });
      if (results.messages) {
        foundEmails.push(...results.messages);
      }
    } catch (error) {
      console.error(`Error searching with query "${query}":`, error.message);
    }
  }
  
  // Deduplicate by messageId
  const uniqueEmails = Array.from(new Map(foundEmails.map(e => [e.messageId, e])).values());
  
  console.log(`Found ${uniqueEmails.length} potential flight emails`);
  return uniqueEmails;
}

/**
 * Process a single email
 */
async function processEmail(email, readMessageFn) {
  const processed = loadProcessedEmails();
  
  // Skip if already processed
  if (processed.includes(email.messageId)) {
    console.log(`Skipping already processed email: ${email.messageId}`);
    return null;
  }
  
  console.log(`\nProcessing email: ${email.headers?.Subject || email.snippet}`);
  
  // Get full email content
  let fullEmail;
  try {
    fullEmail = await readMessageFn({ messageId: email.messageId });
  } catch (error) {
    console.error(`Error reading email ${email.messageId}:`, error.message);
    return null;
  }
  
  // Extract flight details
  const flightDetails = extractFlightDetails(fullEmail);
  
  if (!flightDetails) {
    console.log('Could not extract complete flight details');
    markEmailProcessed(email.messageId);
    return null;
  }
  
  console.log('Extracted flight details:', flightDetails);
  
  // Check if flight is in the future
  const now = new Date();
  const departure = new Date(flightDetails.departureTime);
  
  if (departure < now) {
    console.log('Flight is in the past, skipping');
    markEmailProcessed(email.messageId);
    return null;
  }
  
  // Check if check-in time has already passed (24 hours before)
  const checkinTime = new Date(departure);
  checkinTime.setHours(checkinTime.getHours() - 24);
  
  if (checkinTime < now) {
    console.log('Check-in time has already passed, skipping');
    markEmailProcessed(email.messageId);
    return null;
  }
  
  // Schedule the flight
  try {
    const scheduledFlight = scheduleFlight(flightDetails);
    console.log(`✓ Scheduled check-in for ${flightDetails.airline} flight ${flightDetails.pnr}`);
    markEmailProcessed(email.messageId);
    return scheduledFlight;
  } catch (error) {
    if (error.message.includes('already scheduled')) {
      console.log('Flight already scheduled, skipping');
      markEmailProcessed(email.messageId);
      return null;
    }
    throw error;
  }
}

/**
 * Main function to watch Gmail and schedule flights
 */
async function watchGmail(gmailSearchFn, readMessageFn) {
  console.log('🔍 Searching Gmail for flight confirmations...\n');
  
  const emails = await searchFlightEmails(gmailSearchFn);
  
  if (emails.length === 0) {
    console.log('No flight emails found');
    return [];
  }
  
  const scheduled = [];
  
  for (const email of emails) {
    try {
      const flight = await processEmail(email, readMessageFn);
      if (flight) {
        scheduled.push(flight);
      }
    } catch (error) {
      console.error(`Error processing email:`, error.message);
    }
  }
  
  console.log(`\n✓ Processed ${emails.length} emails, scheduled ${scheduled.length} new check-ins`);
  
  return scheduled;
}

// Export for use as module
module.exports = {
  watchGmail,
  extractFlightDetails,
  searchFlightEmails
};

// CLI usage
if (require.main === module) {
  console.log('Gmail flight watcher requires Gmail API access');
  console.log('Use this module from OpenClaw with Gmail integration');
  process.exit(1);
}
