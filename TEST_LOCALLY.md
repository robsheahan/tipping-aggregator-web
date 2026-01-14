# 🧪 Test Sports Odds Aggregator Locally

Complete guide to test your serverless website on your local machine before deploying.

## Prerequisites

Before starting, ensure you have:
- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] TheOddsAPI key (get free at https://the-odds-api.com/)

### Install Node.js (if needed)

**macOS**:
```bash
brew install node
```

**Windows**:
Download from https://nodejs.org/

**Linux**:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## Step 1: Navigate to Web Directory

```bash
cd web
```

## Step 2: Install Dependencies

```bash
npm install
```

This installs:
- Next.js 14
- React 18
- TypeScript
- date-fns

Expected output:
```
added 234 packages in 15s
```

## Step 3: Set Up Environment Variables

Create `.env.local` file with your API key:

```bash
# Copy the example file
cp .env.local.example .env.local

# Edit with your API key
nano .env.local
# OR
code .env.local  # If using VS Code
```

Add your TheOddsAPI key:
```
THEODDSAPI_KEY=your_actual_api_key_here
```

**Get API Key**:
1. Visit https://the-odds-api.com/
2. Click "Get Started Free"
3. Sign up
4. Copy your API key from dashboard
5. Paste into `.env.local`

## Step 4: Start Development Server

```bash
npm run dev
```

Expected output:
```
   ▲ Next.js 14.1.0
   - Local:        http://localhost:3000
   - Environments: .env.local

 ✓ Ready in 2.3s
```

## Step 5: Open in Browser

Open your browser and go to:
```
http://localhost:3000
```

## 🧪 Testing Checklist

### Test 1: Homepage Loads

**What to check**:
- [ ] Page loads without errors
- [ ] Three league tabs visible: EPL, AFL, NRL
- [ ] Default league (EPL) is selected
- [ ] Loading spinner appears initially

**Expected**: Clean homepage with league tabs

### Test 2: API Routes Work

**Test /api/leagues endpoint**:

```bash
# In a new terminal
curl http://localhost:3000/api/leagues | jq
```

**Expected output**:
```json
[
  {
    "id": 1,
    "name": "English Premier League",
    "sport": "soccer",
    "code": "EPL",
    "country": "England"
  },
  {
    "id": 2,
    "name": "Australian Football League",
    "sport": "afl",
    "code": "AFL",
    "country": "Australia"
  },
  {
    "id": 3,
    "name": "National Rugby League",
    "sport": "nrl",
    "code": "NRL",
    "country": "Australia"
  }
]
```

**Test /api/matches endpoint**:

```bash
curl "http://localhost:3000/api/matches?league=EPL" | jq
```

**Expected**: JSON array of upcoming EPL matches with odds

### Test 3: Match List Displays

**What to check**:
- [ ] Matches appear after loading
- [ ] Each match card shows:
  - Home team name
  - Away team name
  - Kickoff time
  - Probabilities (if available)
  - Tip with confidence
- [ ] Cards are clickable

**If no matches appear**:
- Check browser console for errors (F12 → Console)
- Verify API key is set correctly
- Check terminal for error messages

### Test 4: League Switching

**What to test**:
- [ ] Click "AFL" tab → Shows AFL matches
- [ ] Click "NRL" tab → Shows NRL matches
- [ ] Click "EPL" tab → Shows EPL matches
- [ ] Loading spinner appears when switching

**Note**: Some leagues might not have upcoming matches depending on season

### Test 5: Match Detail Page

**What to test**:
- [ ] Click any match card
- [ ] Detail page loads
- [ ] Shows aggregated probabilities (Home/Draw/Away)
- [ ] Shows tip with confidence
- [ ] Shows bookmaker odds table with:
  - Bookmaker names
  - Individual odds
  - Individual probabilities
  - Last updated time

### Test 6: Odds Aggregation

**What to verify**:

1. **Multiple bookmakers** are listed
2. **Odds vary** between bookmakers
3. **Aggregated probability** makes sense (should be weighted average)
4. **Tip** corresponds to highest probability
5. **Confidence** matches the tip probability

Example verification:
```
Bookmaker A: Home 45%, Away 55%
Bookmaker B: Home 48%, Away 52%
Bookmaker C: Home 46%, Away 54%

Expected aggregation (equal weights):
Home: ~46.3%
Away: ~53.7%
Tip: Away
Confidence: ~54%
```

### Test 7: Navigation

**What to test**:
- [ ] Click "← Back to matches" returns to homepage
- [ ] Direct URL navigation works:
  - `http://localhost:3000/` → Homepage
  - `http://localhost:3000/matches/EVENT_ID` → Match detail

### Test 8: Mobile Responsiveness

**What to test**:
- [ ] Open browser DevTools (F12)
- [ ] Toggle device toolbar (Ctrl+Shift+M)
- [ ] Test on:
  - Mobile (375px width)
  - Tablet (768px width)
  - Desktop (1920px width)
- [ ] Layout adapts properly
- [ ] All text is readable
- [ ] No horizontal scrolling

### Test 9: Error Handling

**Test invalid match ID**:
```bash
curl http://localhost:3000/api/matches/invalid-id
```

**Expected**: 404 or error message

**Test invalid league**:
```bash
curl "http://localhost:3000/api/matches?league=INVALID"
```

**Expected**: Error response

### Test 10: Caching

**What to test**:
1. Load homepage
2. Note response time
3. Refresh page (within 5 minutes)
4. Should load faster (cached)

**Check cache headers**:
```bash
curl -I "http://localhost:3000/api/matches?league=EPL"
```

Look for:
```
Cache-Control: public, s-maxage=300, stale-while-revalidate=600
```

## 📊 Check API Usage

After testing, check how many API calls were made:

1. Visit https://the-odds-api.com/account
2. Check "Requests Remaining"
3. Should have decreased by ~10-20 requests

**Typical usage**:
- Homepage load: ~1-3 requests
- Match detail: ~1 request
- With caching: ~0 requests on refresh

## 🐛 Troubleshooting

### Problem: "Module not found" errors

**Solution**:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Problem: No matches appear

**Solutions**:

1. **Check API key**:
   ```bash
   cat .env.local
   # Verify THEODDSAPI_KEY is set
   ```

2. **Check terminal logs**:
   Look for error messages in the terminal running `npm run dev`

3. **Check browser console**:
   Open DevTools (F12) → Console tab → Look for errors

4. **Test API directly**:
   ```bash
   curl "https://api.the-odds-api.com/v4/sports/soccer_epl/odds?apiKey=YOUR_KEY&regions=au&markets=h2h&oddsFormat=decimal"
   ```

5. **Check TheOddsAPI status**:
   - Visit https://the-odds-api.com/account
   - Verify key is active
   - Check you have remaining requests

### Problem: "THEODDSAPI_KEY environment variable is not set"

**Solution**:
```bash
# Ensure .env.local exists
ls -la .env.local

# Restart dev server after creating .env.local
# Press Ctrl+C to stop
npm run dev
```

### Problem: Build errors

**Solution**:
```bash
# Check for TypeScript errors
npm run build

# Fix any errors shown
```

### Problem: Port 3000 already in use

**Solution**:
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

### Problem: Slow response times

**Explanation**:
- First request takes 2-3 seconds (cold start)
- Subsequent requests are fast (cached)
- This is normal for serverless functions

## ✅ Success Criteria

Your local testing is successful if:

- [ ] Homepage loads without errors
- [ ] All three league tabs work
- [ ] Matches display with odds
- [ ] Match detail pages load
- [ ] Bookmaker odds table shows multiple bookmakers
- [ ] Aggregated probabilities are displayed
- [ ] Tips and confidence scores make sense
- [ ] Mobile view works correctly
- [ ] No console errors
- [ ] API requests are cached properly

## 🎯 Test Different Scenarios

### Scenario 1: Peak Season

Test when leagues have many matches:
- EPL: August-May
- AFL: March-September
- NRL: March-October

### Scenario 2: Off Season

Test when no matches available:
- Should show "No upcoming matches"
- Should handle gracefully

### Scenario 3: Match Day

Test few hours before a match:
- Odds should be available
- Multiple bookmakers should have odds
- Aggregation should work properly

## 📝 Performance Benchmarks

Expected performance on local machine:

| Metric | Target | Typical |
|--------|--------|---------|
| Homepage load | < 3s | 1-2s |
| League switch | < 1s | 0.5s |
| Match detail | < 3s | 1-2s |
| Cached requests | < 200ms | 50-100ms |
| API response | < 2s | 1s |

## 🚀 Next Steps

Once local testing is successful:

1. ✅ All tests pass
2. ✅ No console errors
3. ✅ Odds display correctly
4. ✅ Mobile responsive
5. 📤 **Ready to deploy to Vercel!**

See `DEPLOY_TO_VERCEL.md` for deployment instructions.

## 💡 Pro Tips

### View API Responses

Add this to any page to debug:
```typescript
console.log('Match data:', matches);
```

### Test Different Markets

In `web/src/lib/odds/providers/theoddsapi.ts`, you can change:
```typescript
markets: 'h2h',  // Head to head
// To:
markets: 'spreads',  // Point spreads
markets: 'totals',   // Over/under
```

### Mock Data for Testing

Create `web/src/lib/mockData.ts`:
```typescript
export const mockMatches = [
  {
    id: 'test-1',
    home_team: { name: 'Test Home' },
    away_team: { name: 'Test Away' },
    league: { code: 'EPL', name: 'English Premier League', sport: 'soccer' },
    kickoff_time: new Date().toISOString(),
    status: 'scheduled',
    home_prob: 0.45,
    away_prob: 0.55,
    draw_prob: null,
    tip: 'away',
    confidence: 0.55,
    contributing_providers: 3,
    last_updated: new Date().toISOString(),
  },
];
```

Use in development when API is unavailable.

## 📞 Need Help?

If you encounter issues:

1. Check terminal logs for errors
2. Check browser console (F12)
3. Verify API key is correct
4. Test TheOddsAPI directly with curl
5. Check Next.js docs: https://nextjs.org/docs

## ✨ Happy Testing!

Once everything works locally, you're ready for production deployment! 🚀
