# Sports Odds Aggregator - Serverless Website

A serverless Next.js website that aggregates live sports odds from multiple bookmakers for EPL (English Premier League), AFL (Australian Football League), and NRL (National Rugby League).

## Features

- **Live Odds Aggregation**: Fetches current odds from multiple bookmakers via TheOddsAPI
- **Smart Aggregation**: Normalizes odds, removes bookmaker margins, and aggregates using weighted averages
- **Match Dashboard**: View upcoming matches filtered by league
- **Detailed Match Pages**: See aggregated probabilities and individual bookmaker odds
- **Serverless Architecture**: No database, no backend servers - deployed to Vercel
- **Mobile Responsive**: Works on all devices

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Deployment**: Vercel (serverless functions)
- **Styling**: Tailwind CSS
- **API**: TheOddsAPI

## Architecture

### Serverless API Routes

- `GET /api/leagues` - Returns list of supported leagues
- `GET /api/matches?league=EPL` - Fetches and aggregates matches for a league
- `GET /api/matches/[id]?league=EPL` - Fetches detailed odds for a specific match

### Odds Aggregation Library

Located in `/src/lib/odds/`:

- **types.ts** - TypeScript type definitions
- **conversion.ts** - Odds conversion and normalization utilities
- **aggregation.ts** - Weighted probability aggregation logic
- **weighting.ts** - Provider weighting (currently equal weights)
- **providers/theoddsapi.ts** - TheOddsAPI client wrapper

## Getting Started

### Prerequisites

1. Node.js 18+ installed
2. TheOddsAPI key (free at https://the-odds-api.com/)

### Local Development

1. **Clone and navigate to web directory**:
   ```bash
   cd web
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local and add your TheOddsAPI key
   ```

4. **Run development server**:
   ```bash
   npm run dev
   ```

5. **Open browser**:
   ```
   http://localhost:3000
   ```

## Deployment to Vercel

### Option 1: Vercel Dashboard (Recommended)

1. **Create Vercel account** at https://vercel.com
2. **Import repository**:
   - Click "New Project"
   - Import your GitHub repository
   - Set Root Directory to `web`
3. **Configure environment**:
   - Add environment variable: `THEODDSAPI_KEY=your_key_here`
4. **Deploy**: Click "Deploy"

### Option 2: Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   cd web
   vercel --prod
   ```

4. **Set environment variable** in Vercel dashboard

## How It Works

### Data Flow

1. **User visits homepage** → Selects league (EPL/AFL/NRL)
2. **Frontend calls** `/api/matches?league=EPL`
3. **Serverless function**:
   - Fetches matches from TheOddsAPI
   - For each match, gets odds from all bookmakers
   - Converts decimal odds to probabilities
   - Normalizes to remove bookmaker margins
   - Aggregates using equal weights
   - Calculates tip and confidence
4. **Response cached** for 5 minutes
5. **Frontend displays** match cards with probabilities

### Odds Aggregation Algorithm

1. **Fetch odds** from TheOddsAPI (decimal format)
2. **Convert to probabilities**: P = 1 / decimal_odds
3. **Normalize** to remove overround:
   - 2-way: [P_home, P_away] / (P_home + P_away)
   - 3-way: [P_home, P_draw, P_away] / (P_home + P_draw + P_away)
4. **Aggregate** using weighted average:
   - P_agg = Σ(w_i × P_i) / Σ(w_i)
   - Currently using equal weights for all bookmakers
5. **Calculate tip**: Outcome with highest aggregated probability
6. **Calculate confidence**: Value of highest probability

## Caching Strategy

- **Match list**: Cached for 5 minutes (Vercel edge cache)
- **Match details**: Cached for 1 minute
- **Leagues**: Cached for 1 hour (static data)

## API Rate Limits

TheOddsAPI free tier provides:
- 500 requests per month
- Aggressive caching keeps usage low
- ~10-20 requests per page load with empty cache
- ~0 requests per page load with full cache

## Project Structure

```
web/
├── src/
│   ├── app/
│   │   ├── api/              # Serverless API routes
│   │   │   ├── leagues/
│   │   │   └── matches/
│   │   ├── matches/[id]/     # Match detail page
│   │   └── page.tsx          # Homepage
│   ├── components/
│   │   └── MatchCard.tsx     # Match display component
│   ├── lib/
│   │   ├── api.ts            # Frontend API client
│   │   ├── types.ts          # TypeScript types
│   │   └── odds/             # Odds aggregation library
│   │       ├── types.ts
│   │       ├── conversion.ts
│   │   │       ├── aggregation.ts
│   │       ├── weighting.ts
│   │       └── providers/
│   │           └── theoddsapi.ts
│   └── utils/
│       └── formatting.ts     # Display formatting helpers
├── vercel.json               # Vercel configuration
├── package.json
└── .env.local.example        # Environment template
```

## Environment Variables

Required in production (Vercel dashboard):

```
THEODDSAPI_KEY=your_api_key_here
```

## Future Enhancements

- **Historical tracking**: Add database (Vercel Postgres) to store odds history
- **Performance-based weighting**: Track bookmaker accuracy and adjust weights
- **Multiple providers**: Add more odds APIs (Polymarket, etc.)
- **User preferences**: Save favorite teams/leagues
- **Notifications**: Alert when odds move significantly
- **Live updates**: WebSocket connection for real-time odds

## Troubleshooting

### Odds not loading

1. Check API key is set in Vercel environment variables
2. Verify TheOddsAPI account is active and has remaining quota
3. Check browser console for error messages

### Slow page loads

1. Caching should make subsequent loads fast
2. Cold starts on serverless functions take ~2-3 seconds
3. Check TheOddsAPI status page

### Build errors

1. Ensure Node.js 18+ is installed
2. Delete `node_modules` and `.next`, then reinstall
3. Check TypeScript errors with `npm run build`

## License

MIT

## Support

- TheOddsAPI Docs: https://the-odds-api.com/liveapi/guides/v4/
- Vercel Docs: https://vercel.com/docs
- Next.js Docs: https://nextjs.org/docs
