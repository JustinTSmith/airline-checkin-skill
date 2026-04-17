#!/bin/bash

# Airline Check-in Skill Installation Script

set -e

SKILL_DIR="$HOME/.openclaw/skills/user/airline-checkin"
FLIGHTS_DIR="$HOME/.openclaw/flights"

echo "✈️  Installing Airline Check-in Skill..."
echo ""

# Create directories
echo "📁 Creating directories..."
mkdir -p "${SKILL_DIR}"
mkdir -p "${FLIGHTS_DIR}"
mkdir -p "$HOME/Downloads/boarding-passes"

# Copy skill files
echo "📋 Copying skill files..."
cp -r ./* "${SKILL_DIR}/"

# Make scripts executable
chmod +x "${SKILL_DIR}/checkin.js"
chmod +x "${SKILL_DIR}/gmail-watcher.js"

# Install Node.js dependencies
echo "📦 Installing dependencies..."
cd "${SKILL_DIR}"

if command -v npm &> /dev/null; then
    npm install
    echo "✓ Dependencies installed via npm"
else
    echo "⚠️  npm not found. Install Node.js and run: cd ${SKILL_DIR} && npm install"
fi

# Install Playwright browser
echo "🌐 Installing Playwright Chromium browser..."
if command -v npx &> /dev/null; then
    npx playwright install chromium
    echo "✓ Chromium installed"
else
    echo "⚠️  npx not found. Run manually: npx playwright install chromium"
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "📝 Next steps:"
echo ""
echo "1. Set up Telegram notifications (optional):"
echo "   Add to your ~/.zshrc or ~/.bashrc:"
echo "   export TELEGRAM_BOT_TOKEN=\"your-bot-token\""
echo "   export TELEGRAM_CHAT_ID=\"your-chat-id\""
echo ""
echo "2. Test the installation:"
echo "   node ${SKILL_DIR}/checkin.js --list"
echo ""
echo "3. Start using:"
echo "   Tell Claude: 'Schedule check-in for my flight...'"
echo "   Or: 'Check my email for flight bookings'"
echo ""
echo "📖 Full documentation:"
echo "   ${SKILL_DIR}/README.md"
echo "   ${SKILL_DIR}/PLAYWRIGHT_SETUP.md"
echo "   ${SKILL_DIR}/TELEGRAM_SETUP.md"
echo ""
