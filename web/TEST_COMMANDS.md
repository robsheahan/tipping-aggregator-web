# Quick Test Commands

Run these commands to test the API locally after starting `npm run dev`.

## Setup

```bash
cd web
npm install
cp .env.local.example .env.local
# Edit .env.local with your API key
npm run dev
```

## API Endpoint Tests

### Test Leagues Endpoint

```bash
curl http://localhost:3000/api/leagues | jq
```

Expected: JSON array with 3 leagues (EPL, AFL, NRL)

### Test Matches Endpoint (EPL)

```bash
curl "http://localhost:3000/api/matches?league=EPL" | jq
```

Expected: Array of upcoming EPL matches with odds

### Test Matches Endpoint (AFL)

```bash
curl "http://localhost:3000/api/matches?league=AFL" | jq
```

### Test Matches Endpoint (NRL)

```bash
curl "http://localhost:3000/api/matches?league=NRL" | jq
```

### Test Match Detail

First, get a match ID from the matches endpoint, then:

```bash
# Replace EVENT_ID with actual ID from matches response
curl "http://localhost:3000/api/matches/EVENT_ID?league=EPL" | jq
```

Expected: Match details with bookmaker odds breakdown

## Check Cache Headers

```bash
curl -I "http://localhost:3000/api/matches?league=EPL"
```

Look for:
```
Cache-Control: public, s-maxage=300, stale-while-revalidate=600
```

## Test in Browser

1. Open http://localhost:3000
2. Open DevTools (F12) → Network tab
3. Switch between league tabs
4. Check request/response in Network tab

## Test API Key

If odds aren't loading:

```bash
# Check environment variable is set
cat .env.local | grep THEODDSAPI_KEY

# Test TheOddsAPI directly
curl "https://api.the-odds-api.com/v4/sports?apiKey=YOUR_KEY"
```

## Check Build

```bash
npm run build
```

Should complete without errors.

## Check TypeScript

```bash
npx tsc --noEmit
```

Should have no type errors.

## Monitor Logs

Watch the terminal running `npm run dev` for:
- API requests
- Errors
- Cache hits/misses

## Test Different Scenarios

### No matches available

```bash
# Try league in off-season
curl "http://localhost:3000/api/matches?league=NRL" | jq
```

### Invalid league

```bash
curl "http://localhost:3000/api/matches?league=INVALID" | jq
```

Expected: Error response

### Invalid match ID

```bash
curl "http://localhost:3000/api/matches/invalid-id?league=EPL" | jq
```

Expected: 404 or error

## Performance Testing

```bash
# Install hey (HTTP load tester)
# macOS: brew install hey
# Linux: go install github.com/rakyll/hey@latest

# Test match list endpoint
hey -n 100 -c 10 "http://localhost:3000/api/matches?league=EPL"
```

## Browser Console Tests

Open DevTools console (F12) and run:

```javascript
// Test API client
fetch('/api/leagues')
  .then(r => r.json())
  .then(console.log);

// Test matches
fetch('/api/matches?league=EPL')
  .then(r => r.json())
  .then(console.log);
```

## Success Indicators

✅ All endpoints return JSON
✅ Matches have probabilities
✅ Multiple bookmakers listed
✅ Aggregated odds make sense
✅ Cache headers present
✅ No TypeScript errors
✅ Build completes successfully

## Ready to Deploy?

If all tests pass:
1. Commit your changes
2. Push to GitHub
3. Follow DEPLOY_TO_VERCEL.md
