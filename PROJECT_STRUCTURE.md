# 📁 Project Structure

Complete file tree for the Australian Horse Racing Odds Aggregator & AI Consensus Engine.

```
tipping-aggregator/
│
├── 📄 docker-compose.yml          # Docker services configuration
├── 📄 .env.example                 # Environment variables template
├── 📄 .env                         # Your actual credentials (git-ignored)
├── 📄 README.md                    # Main project documentation
├── 📄 RACING_AUTOMATION_SETUP.md  # Setup guide for racing automation
├── 📄 PROJECT_STRUCTURE.md        # This file
│
├── 📂 backend/                     # Python FastAPI Backend
│   ├── 📄 main.py                 # FastAPI application entry point
│   ├── 📄 Dockerfile              # Docker image for backend
│   ├── 📄 requirements.txt        # Python dependencies
│   │
│   ├── 📂 api/                    # API Routes
│   │   ├── 📄 __init__.py
│   │   ├── 📄 races.py            # Race endpoints
│   │   ├── 📄 consensus.py        # Consensus score endpoints
│   │   └── 📄 affiliates.py       # Affiliate link generation & tracking
│   │
│   ├── 📂 models/                 # Data Models
│   │   ├── 📄 __init__.py
│   │   └── 📄 database.py         # Pydantic models for database
│   │
│   ├── 📂 utils/                  # Utility Modules
│   │   ├── 📄 __init__.py
│   │   ├── 📄 database.py         # Supabase client & operations
│   │   ├── 📄 racing_api.py       # The Racing API client
│   │   └── 📄 claude_analyzer.py  # Claude AI tip analyzer
│   │
│   ├── 📂 workers/                # Background Workers
│   │   ├── 📄 __init__.py
│   │   └── 📄 aggregator.py       # Main automation worker
│   │
│   ├── 📂 scrapers/               # Web Scrapers
│   │   ├── 📄 __init__.py
│   │   └── 📄 tips_scraper.py     # Playwright-based tip scraper
│   │
│   ├── 📂 database/               # Database Files
│   │   └── 📄 schema.sql          # Supabase PostgreSQL schema
│   │
│   └── 📂 logs/                   # Log Files (created at runtime)
│       ├── 📄 api.log
│       └── 📄 worker.log
│
├── 📂 web/                        # Next.js Frontend
│   ├── 📄 package.json
│   ├── 📄 package-lock.json
│   ├── 📄 tsconfig.json
│   ├── 📄 next.config.js
│   ├── 📄 tailwind.config.js
│   ├── 📄 Dockerfile              # Docker image for frontend
│   │
│   ├── 📂 src/
│   │   │
│   │   ├── 📂 app/                # Next.js App Router
│   │   │   ├── 📄 layout.tsx     # Root layout with nav & compliance footer
│   │   │   ├── 📄 page.tsx       # Homepage (sport selection)
│   │   │   ├── 📄 globals.css    # Global styles & design system
│   │   │   │
│   │   │   ├── 📂 racing/         # Horse Racing Pages
│   │   │   │   └── 📄 page.tsx   # Racing odds comparison
│   │   │   │
│   │   │   ├── 📂 sport/[sportCode]/  # Dynamic Sport Pages
│   │   │   │   └── 📄 page.tsx        # AFL, NRL, NFL, etc.
│   │   │   │
│   │   │   ├── 📂 matches/[id]/  # Match Detail Pages
│   │   │   │   └── 📄 route.ts   # Individual match view
│   │   │   │
│   │   │   └── 📂 api/            # Next.js API Routes
│   │   │       ├── 📂 matches/
│   │   │       │   ├── 📄 route.ts         # Get matches
│   │   │       │   └── 📂 [id]/
│   │   │       │       └── 📄 route.ts     # Get match details
│   │   │       │
│   │   │       ├── 📂 racing/
│   │   │       │   └── 📄 route.ts         # Get racing data
│   │   │       │
│   │   │       └── 📂 leagues/
│   │   │           └── 📄 route.ts         # Get leagues
│   │   │
│   │   ├── 📂 components/         # React Components
│   │   │   ├── 📄 SportCard.tsx           # Homepage sport cards
│   │   │   ├── 📄 MatchCard.tsx           # Team sports match display
│   │   │   ├── 📄 RacingGrid.tsx          # Racing odds grid with consensus
│   │   │   ├── 📄 ComplianceFooter.tsx    # ACMA 2026 compliant footer
│   │   │   └── 📄 RoundFilter.tsx         # Round selection dropdown
│   │   │
│   │   └── 📂 lib/               # Frontend Utilities
│   │       ├── 📄 api.ts         # API client functions
│   │       │
│   │       ├── 📂 config/
│   │       │   ├── 📄 sports.ts          # Sport configurations
│   │       │   └── 📄 affiliates.ts      # Affiliate link config
│   │       │
│   │       ├── 📂 odds/
│   │       │   ├── 📄 aggregation.ts     # Odds aggregation logic
│   │       │   ├── 📄 weighting.ts       # Weight calculation
│   │       │   └── 📂 providers/
│   │       │       ├── 📄 theoddsapi.ts  # TheOddsAPI client
│   │       │       └── 📄 racingapi.ts   # Racing API client
│   │       │
│   │       └── 📂 rounds/
│   │           └── 📄 roundMappings.ts   # Round/week mappings
│   │
│   └── 📂 public/                # Static Assets
│       └── 📄 (images, icons, etc.)
│
├── 📂 scripts/                   # Utility Scripts
│   ├── 📄 check_racing_api.py   # Diagnostic script for Racing API
│   └── 📄 check-theodds-sports.js  # Check TheOddsAPI sports
│
└── 📂 .github/                   # GitHub Configuration (optional)
    └── 📂 workflows/
        └── 📄 deploy.yml        # CI/CD workflow
```

## 🎯 Key Files Explained

### Backend Core Files

**`backend/main.py`**
- FastAPI application
- Includes API routers
- Configures CORS
- Health check endpoints
- Affiliate redirect handler at `/go/{bookmaker}`

**`backend/workers/aggregator.py`**
- Main automation script
- Runs on schedule (default: every 2 hours)
- 6-step pipeline:
  1. Fetch meets & races
  2. Fetch odds
  3. Scrape tips
  4. Analyze with Claude
  5. Calculate consensus
  6. Generate verdicts

**`backend/utils/claude_analyzer.py`**
- Claude AI integration
- `analyze_tip()` - Extract confidence & category
- `generate_verdict()` - Create 1-sentence summary
- Handles API errors gracefully

**`backend/utils/database.py`**
- Supabase client
- All database operations
- Upsert meets, races, odds
- Save tips & consensus scores
- Track affiliate clicks

**`backend/database/schema.sql`**
- PostgreSQL schema for Supabase
- 6 tables: meets, races, race_odds, expert_tips, consensus_scores, affiliate_clicks
- RLS policies for security
- Helper functions
- Triggers for auto-timestamps

### Frontend Core Files

**`web/src/app/page.tsx`**
- Homepage with sport selection cards
- Fetches match counts for each sport
- Hero section with gradient headline

**`web/src/app/racing/page.tsx`**
- Horse racing odds comparison
- Uses RacingGrid component
- Fetches from `/api/racing`
- Auto-refreshes every 60 seconds

**`web/src/components/RacingGrid.tsx`**
- Main racing display component
- Consensus meters (0-100 visual bars)
- AI verdict tooltips on hover
- Best odds highlighted
- "Bet Now" buttons with affiliate links

**`web/src/components/ComplianceFooter.tsx`**
- ACMA 2026 compliant footer
- Mandatory warnings
- BetStop links
- Gambling help resources
- Sticky at bottom

**`web/src/lib/config/sports.ts`**
- Central sport configuration
- Maps sport codes to TheOddsAPI keys
- Defines market types (2way, 3way, racing)
- Sport colors and icons

### Configuration Files

**`docker-compose.yml`**
- Defines 4 services:
  - `web` - Next.js frontend (port 3000)
  - `api` - FastAPI backend (port 8000)
  - `worker` - Background aggregator
  - `redis` - Cache & job queue (port 6379)

**`.env` (your actual credentials)**
```bash
RACINGAPI_USERNAME=xxx
RACINGAPI_PASSWORD=xxx
ANTHROPIC_API_KEY=sk-ant-xxx
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
THEODDSAPI_KEY=xxx
NEXT_PUBLIC_APP_URL=https://yourdomain.com
SPORTSBET_AFFILIATE_ID=xxx
```

## 📊 Data Flow

```
The Racing API
      ↓
   Worker fetches races & odds
      ↓
   Scraper gets expert tips
      ↓
   Claude analyzes tips
      ↓
   Consensus calculated
      ↓
   Saved to Supabase
      ↓
   Frontend fetches via API
      ↓
   RacingGrid displays
      ↓
   User clicks "Bet Now"
      ↓
   Affiliate redirect tracked
```

## 🔄 Update Workflow

### Adding a New Scraping Source

1. Update `SCRAPING_TARGETS` in `.env`
2. Add parser method in `backend/scrapers/tips_scraper.py`
3. Test with `--once` flag
4. Deploy worker

### Modifying AI Prompts

1. Edit prompts in `backend/utils/claude_analyzer.py`
2. Test locally
3. Monitor costs in Anthropic dashboard
4. Adjust `temperature` parameter if needed

### Adding New Affiliate Networks

1. Get affiliate IDs
2. Add to `.env`
3. Update `AFFILIATE_CONFIG` in `backend/api/affiliates.py`
4. Test links before going live

### Updating Frontend Design

1. Edit components in `web/src/components/`
2. Modify global styles in `web/src/app/globals.css`
3. Test locally: `npm run dev`
4. Deploy to Vercel

## 🚀 Deployment Checklist

- [ ] Supabase project created
- [ ] Database schema applied
- [ ] Environment variables configured
- [ ] Racing API credentials verified
- [ ] Anthropic API key set
- [ ] Frontend deployed to Vercel
- [ ] Backend deployed to Fly.io/Railway
- [ ] Worker scheduled (every 2 hours)
- [ ] Compliance footer reviewed
- [ ] Affiliate links tested
- [ ] Monitoring enabled

## 📝 Notes

- **Git Ignore**: `.env`, `logs/`, `node_modules/`, `.next/`, `__pycache__/`
- **Logs**: All logs in `backend/logs/` (rotating, 10 days retention)
- **Rate Limits**: Racing API 2 req/sec, Claude ~4 req/sec
- **Costs**: ~$12/month Claude + $50/month Racing API
- **Scrapers**: Update CSS selectors if websites change
- **Compliance**: Never modify footer without legal review

---

Last updated: 2026-01-15
