#!/bin/bash

# Quick Start Script for Local Testing
# Run this from the web/ directory

set -e

echo "🚀 Sports Odds Aggregator - Quick Start"
echo "========================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "   Install from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi

echo "✅ npm version: $(npm --version)"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local not found"
    echo "   Creating from template..."
    cp .env.local.example .env.local
    echo ""
    echo "📝 IMPORTANT: Edit .env.local and add your TheOddsAPI key"
    echo "   Get your free key at: https://the-odds-api.com/"
    echo ""
    echo "   Then run this script again."
    exit 0
fi

# Check if API key is set
if grep -q "your_theoddsapi_key_here" .env.local; then
    echo "❌ API key not configured in .env.local"
    echo "   Edit .env.local and replace 'your_theoddsapi_key_here' with your actual key"
    echo "   Get your free key at: https://the-odds-api.com/"
    exit 1
fi

echo "✅ .env.local configured"
echo ""

# Install dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
    echo ""
else
    echo "✅ Dependencies already installed"
    echo ""
fi

# Build check (optional)
echo "🔨 Checking build..."
if npm run build > /dev/null 2>&1; then
    echo "✅ Build successful"
else
    echo "⚠️  Build has errors (check with: npm run build)"
fi
echo ""

# Start dev server
echo "🚀 Starting development server..."
echo ""
echo "   Local:    http://localhost:3000"
echo "   Press Ctrl+C to stop"
echo ""
echo "📋 Testing checklist:"
echo "   1. Open http://localhost:3000 in your browser"
echo "   2. Try switching between EPL/AFL/NRL tabs"
echo "   3. Click on a match to see details"
echo "   4. Verify odds and bookmakers display"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npm run dev
