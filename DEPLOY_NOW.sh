#!/bin/bash

# One-Command Deployment Script
# This will deploy your site to Vercel in minutes

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🚀 DEPLOY TO VERCEL - AUTOMATED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if running in correct directory
if [ ! -d "web" ]; then
    echo "❌ Error: Must run from tipping-aggregator root directory"
    echo "   cd tipping-aggregator"
    echo "   ./DEPLOY_NOW.sh"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found"
    echo "   Install from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js: $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found"
    exit 1
fi

echo "✅ npm: $(npm --version)"
echo ""

# Install Vercel CLI if not present
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
    echo "✅ Vercel CLI installed"
    echo ""
fi

echo "✅ Vercel CLI ready"
echo ""

# Check for API key
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🔑 API KEY SETUP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ ! -f "web/.env.local" ]; then
    echo "⚠️  No .env.local found"
    echo ""
    read -p "Do you have a TheOddsAPI key? (y/n) " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        read -p "Enter your TheOddsAPI key: " api_key
        echo "THEODDSAPI_KEY=$api_key" > web/.env.local
        echo "✅ API key saved to web/.env.local"
    else
        echo ""
        echo "❌ You need a TheOddsAPI key to deploy"
        echo ""
        echo "Get your free key:"
        echo "1. Visit: https://the-odds-api.com/"
        echo "2. Click 'Get Started Free'"
        echo "3. Sign up and copy your key"
        echo "4. Run this script again"
        echo ""
        exit 1
    fi
else
    # Check if key is still placeholder
    if grep -q "your_theoddsapi_key_here" web/.env.local; then
        echo "⚠️  API key not configured"
        echo ""
        read -p "Enter your TheOddsAPI key: " api_key
        echo "THEODDSAPI_KEY=$api_key" > web/.env.local
        echo "✅ API key updated"
    else
        echo "✅ API key configured"
    fi
fi

API_KEY=$(grep THEODDSAPI_KEY web/.env.local | cut -d '=' -f2)
echo ""

# Install dependencies
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📦 INSTALLING DEPENDENCIES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd web

if [ ! -d "node_modules" ]; then
    echo "Installing npm packages..."
    npm install --silent
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi

echo ""

# Test build
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🔨 TESTING BUILD"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if npm run build > /dev/null 2>&1; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
    echo "   Run 'npm run build' to see errors"
    exit 1
fi

echo ""

# Login to Vercel
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🔐 VERCEL LOGIN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "This will open a browser to log in to Vercel..."
echo "If you don't have an account, you can create one for free."
echo ""
read -p "Press Enter to continue..."

vercel login

echo ""

# Deploy
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🚀 DEPLOYING TO VERCEL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Deploying your website..."
echo ""

# Deploy with environment variable
vercel --prod -e THEODDSAPI_KEY="$API_KEY"

DEPLOY_URL=$(vercel inspect --token $(vercel whoami --token) 2>/dev/null | grep -o 'https://[^"]*' | head -1)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🎉 DEPLOYMENT COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Your site is live!"
echo ""
echo "🌐 URL: Check terminal output above"
echo ""
echo "Next steps:"
echo "1. Open the URL in your browser"
echo "2. Test the EPL/AFL/NRL tabs"
echo "3. Click on matches to see odds"
echo ""
echo "Note: If you see 'Error: THEODDSAPI_KEY not set':"
echo "1. Go to vercel.com → your project → Settings → Environment Variables"
echo "2. Add: THEODDSAPI_KEY = $API_KEY"
echo "3. Redeploy"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
