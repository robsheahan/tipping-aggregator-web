# 🏇 Australian Horse Racing Automation Setup Guide

Complete setup guide for the automated Australian Horse Racing Odds Aggregator with AI Consensus Engine.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Initial Setup](#initial-setup)
4. [Supabase Configuration](#supabase-configuration)
5. [API Keys Setup](#api-keys-setup)
6. [Running the System](#running-the-system)
7. [Deployment](#deployment)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

## 🎯 Overview

This system automates:
- ✅ Fetching Australian race meetings and odds from The Racing API
- ✅ Scraping expert tips from Racing.com and Sky Racing
- ✅ AI analysis of tips using Claude 3.5 Sonnet
- ✅ Generating consensus scores (0-100) for each runner
- ✅ Creating AI verdicts summarizing expert opinions
- ✅ Displaying results in a modern React interface
- ✅ Affiliate tracking with deep linking
- ✅ ACMA 2026 compliant gambling warnings

## 📦 Prerequisites

### Required Accounts & API Keys

1. **Supabase Account** (Free tier available)
   - Sign up: https://supabase.com
   - You'll need: URL, Anon Key, Service Role Key

2. **The Racing API** ($49.99/month for Australia add-on)
   - Sign up: https://www.theracingapi.com
   - You'll need: Username and Password
   - You already have: `CGOD0RK5J6r6ii7WuSHh0nCa` / `hCt3wDBkOGRcw3sSIQ6t7Ttm`

3. **Anthropic API** (Claude)
   - Sign up: https://console.anthropic.com
   - Get API key from dashboard
   - Pricing: ~$3-5 per 1000 tips analyzed

4. **Optional: Affiliate Networks**
   - Commission Kings: https://commissionkings.com.au
   - Partnerize: https://partnerize.com

### System Requirements

- Docker & Docker Compose OR
- Node.js 18+
- Python 3.11+
- 4GB RAM minimum
- 20GB disk space

## 🚀 Initial Setup

### Step 1: Create Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Enter project details:
   - Name: `tipping-aggregator` (or your choice)
   - Database Password: (save this!)
   - Region: Sydney (closest to Australia)
4. Wait for project to be created (~2 minutes)

### Step 2: Get Supabase Credentials

In your Supabase project dashboard:

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxx.supabase.co`
   - **Anon Key**: `eyJhb...` (public, safe for frontend)
   - **Service Role Key**: `eyJhb...` (secret, backend only!)

### Step 3: Create Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `backend/database/schema.sql`
4. Paste into the SQL editor
5. Click **Run** (bottom right)
6. Verify: Check **Table Editor** - you should see 6 tables

### Step 4: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your values:
   ```bash
   # The Racing API (YOU ALREADY HAVE THESE)
   RACINGAPI_USERNAME=CGOD0RK5J6r6ii7WuSHh0nCa
   RACINGAPI_PASSWORD=hCt3wDBkOGRcw3sSIQ6t7Ttm

   # Anthropic Claude API (GET FROM https://console.anthropic.com)
   ANTHROPIC_API_KEY=sk-ant-api03-xxx

   # Supabase (FROM STEP 2 ABOVE)
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_SERVICE_KEY=eyJhb...

   # TheOddsAPI (YOU ALREADY HAVE THIS)
   THEODDSAPI_KEY=60421efaf7fbecb5328fbd6d5abaa349

   # App URL (UPDATE AFTER DEPLOYMENT)
   NEXT_PUBLIC_APP_URL=http://localhost:3000

   # Affiliate IDs (OPTIONAL - ADD LATER)
   SPORTSBET_AFFILIATE_ID=
   LADBROKES_AFFILIATE_ID=
   NEDS_AFFILIATE_ID=
   ```

### Step 5: Start Services with Docker

```bash
# Build and start all services
docker-compose up --build -d

# Check logs
docker-compose logs -f
```

Services will start:
- ✅ Frontend: http://localhost:3000
- ✅ Backend API: http://localhost:8000
- ✅ API Docs: http://localhost:8000/docs
- ✅ Worker: Running in background
- ✅ Redis: Running on port 6379

### Step 6: Test the Worker

Run a manual aggregation to test everything:

```bash
# Run worker once
docker-compose run worker python workers/aggregator.py --once
```

Expected output:
```
Starting Racing Aggregator Run
Step 1: Fetching today's race meetings...
✓ Fetched 8 races
Step 2: Fetching odds...
✓ Odds fetched and saved
Step 3: Scraping expert tips...
✓ Scraped 24 expert tips
Step 4: Analyzing tips with Claude AI...
✓ Analyzed 24 tips
Step 5: Calculating consensus scores...
✓ Generated 15 consensus scores
Step 6: Generating AI verdicts...
✓ AI verdicts generated
Aggregator run completed successfully!
```

### Step 7: Verify Data in Supabase

1. Go to Supabase dashboard → **Table Editor**
2. Check these tables have data:
   - `meets` - Should have today's race meetings
   - `races` - Should have race details
   - `race_odds` - Should have odds from bookmakers
   - `expert_tips` - Should have scraped tips
   - `consensus_scores` - Should have AI consensus scores

### Step 8: View the Frontend

1. Open http://localhost:3000
2. Navigate to **Horse Racing** page
3. You should see:
   - Today's races listed by venue
   - Runners with consensus meters
   - Best odds highlighted
   - AI verdicts on hover

## 📊 API Keys Setup

### Anthropic Claude API

1. Go to https://console.anthropic.com
2. Sign in or create account
3. Click **Get API Keys**
4. Create new key: "Racing Tips Analyzer"
5. Copy key (starts with `sk-ant-api03-`)
6. Add to `.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-xxx
   ```

**Cost Estimate:**
- ~500 tokens per tip analysis
- ~100 tokens per verdict
- ~1000 tips/day = $0.40/day = $12/month

### Affiliate Networks

#### Commission Kings (Recommended for AU)

1. Apply: https://commissionkings.com.au
2. Select bookmakers:
   - Sportsbet
   - Ladbrokes
   - Neds
   - TAB
3. Get tracking IDs
4. Add to `.env`:
   ```
   SPORTSBET_AFFILIATE_ID=your_id_here
   LADBROKES_AFFILIATE_ID=your_id_here
   NEDS_AFFILIATE_ID=your_id_here
   ```

**Revenue Potential:**
- 25-35% revenue share
- 100 clicks/day × 5% conversion × $50 bet × 30% share = ~$7.50/day
- Monthly estimate: $200-300

## 🚢 Deployment

### Frontend (Vercel)

1. Push code to GitHub
2. Go to https://vercel.com
3. Click **New Project**
4. Import your GitHub repository
5. Configure:
   - Framework Preset: Next.js
   - Root Directory: `web`
   - Build Command: `npm run build`
   - Environment Variables: Add all `NEXT_PUBLIC_*` vars
6. Deploy
7. Copy production URL
8. Update `.env`:
   ```
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   ```

### Backend (Fly.io or Railway)

#### Option A: Fly.io

```bash
cd backend

# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Launch app
flyctl launch

# Set environment variables
flyctl secrets set RACINGAPI_USERNAME=xxx
flyctl secrets set RACINGAPI_PASSWORD=xxx
flyctl secrets set ANTHROPIC_API_KEY=xxx
flyctl secrets set SUPABASE_URL=xxx
flyctl secrets set SUPABASE_SERVICE_KEY=xxx

# Deploy
flyctl deploy
```

#### Option B: Railway

1. Go to https://railway.app
2. Click **New Project** → **Deploy from GitHub**
3. Select repository
4. Add environment variables in Railway dashboard
5. Deploy

### Worker (Background Service)

Deploy worker separately with command:
```bash
python workers/aggregator.py
```

Set schedule in environment:
```bash
WORKER_SCHEDULE="0 */2 * * *"  # Every 2 hours
```

## 🧪 Testing

### Test Racing API Connection

```bash
python -c "
import asyncio
from backend.utils.racing_api import RacingAPIClient

async def test():
    client = RacingAPIClient()
    success = await client.test_connection()
    print(f'Connection: {'✓' if success else '✗'}')

asyncio.run(test())
"
```

### Test Claude API

```bash
python -c "
import asyncio
from backend.utils.claude_analyzer import ClaudeAnalyzer

async def test():
    analyzer = ClaudeAnalyzer()
    result = await analyzer.analyze_tip('This horse looks a great bet, expecting it to win easily')
    print(f'Score: {result['confidence_score']}/100')
    print(f'Category: {result['category']}')

asyncio.run(test())
"
```

### Test Database Connection

```bash
python -c "
import asyncio
from backend.utils.database import SupabaseClient

async def test():
    db = SupabaseClient()
    print('✓ Database connected')

asyncio.run(test())
"
```

## 🔧 Troubleshooting

### Problem: Worker throws "RACINGAPI_USERNAME not set"

**Solution:**
```bash
# Check .env file exists
ls -la .env

# Verify variables are set
docker-compose config | grep RACINGAPI
```

### Problem: "No races found for today"

**Causes:**
1. Racing API credentials incorrect
2. No Australian races today (check manually)
3. Network/firewall issues

**Solution:**
```bash
# Test API connection
docker-compose run worker python -c "
from utils.racing_api import RacingAPIClient
import asyncio
asyncio.run(RacingAPIClient().test_connection())
"
```

### Problem: Claude API "Invalid API Key"

**Solution:**
1. Verify key starts with `sk-ant-api03-`
2. Check for extra spaces in .env
3. Regenerate key in Anthropic dashboard

### Problem: No consensus scores appearing

**Causes:**
1. No expert tips scraped
2. Claude analysis failed
3. Scraper selectors outdated

**Solution:**
```bash
# Check expert_tips table
docker-compose exec api python -c "
from utils.database import SupabaseClient
db = SupabaseClient()
result = db.client.table('expert_tips').select('*').execute()
print(f'Tips found: {len(result.data)}')
"
```

### Problem: Scraper finds no tips

**Note:** The scraper uses EXAMPLE CSS selectors. You MUST update them:

1. Open Racing.com in browser
2. Right-click → Inspect
3. Find tip elements
4. Update selectors in `backend/scrapers/tips_scraper.py`

Example:
```python
# OLD (example)
tip_sections = soup.select('.tip-section')

# NEW (your actual selectors)
tip_sections = soup.select('.race-tips-container .tip-card')
```

### Problem: Frontend shows "No races available"

**Check:**
```bash
# 1. Verify database has races
# 2. Check API endpoint
curl http://localhost:8000/api/races/today

# 3. Check frontend is calling correct API
# Look in browser console for errors
```

## 📈 Monitoring

### Check Worker Logs

```bash
docker-compose logs -f worker
```

### Check API Logs

```bash
tail -f backend/logs/api.log
tail -f backend/logs/worker.log
```

### Monitor Supabase

Supabase Dashboard → **Database** → **Table Editor**

Check row counts:
- `meets`: Should update daily
- `races`: Should have ~50-100 rows daily
- `expert_tips`: Should grow throughout the day
- `consensus_scores`: Should match unique runners

### Check Affiliate Clicks

```bash
curl http://localhost:8000/api/affiliates/stats
```

## 🎯 Next Steps

1. ✅ **Customize Scrapers**: Update CSS selectors for Racing.com and Sky Racing
2. ✅ **Add More Sources**: Add more expert tip sources
3. ✅ **Join Affiliate Networks**: Apply to Commission Kings
4. ✅ **Deploy to Production**: Follow deployment steps
5. ✅ **Monitor Performance**: Track click-through rates
6. ✅ **Optimize Verdicts**: Fine-tune Claude prompts for better summaries

## 💡 Tips & Best Practices

1. **Start Small**: Run worker manually (--once) first, then enable scheduling
2. **Monitor Costs**: Claude API costs ~$0.40/day for 1000 tips
3. **Update Scrapers**: Websites change - check scrapers monthly
4. **Verify Data**: Spot-check consensus scores match expert sentiment
5. **Compliance**: Never modify the compliance footer
6. **Rate Limits**: Racing API: 2 req/sec, Claude: ~4 req/sec

## 📞 Support Resources

- **The Racing API**: support@theracingapi.com
- **Anthropic**: support@anthropic.com
- **Supabase**: support@supabase.com
- **This Project**: Create GitHub issue

---

🎉 **You're all set!** The automated racing aggregator should now be fetching races, analyzing tips, and displaying consensus scores every 2 hours.
