# Horse Racing Odds Aggregator Setup Guide

## Overview
This document explains how to set up the horse racing odds aggregator feature with affiliate links and compliance requirements for the Australian market.

## 1. Data Source Setup

### TheOddsAPI Configuration
1. Sign up for an API key at [the-odds-api.com](https://the-odds-api.com)
2. Navigate to their Australian Horse Racing endpoint
3. Add your API key to your environment variables:
   ```bash
   THEODDSAPI_KEY=your_api_key_here
   ```

### API Endpoints to Use
- **Horse Racing Events**: `GET /v4/sports/horse_racing_australia/odds`
- **Markets**: Use `h2h` market for win odds
- **Regions**: Set to `au` for Australian bookmakers

## 2. Affiliate Network Setup

### Recommended Networks

#### Commission Kings (Ladbrokes/Neds)
- Website: [commissionkings.com.au](https://commissionkings.com.au)
- Covers: Ladbrokes, Neds
- Revenue Share: 25-35%
- Sign-up process: Apply online, wait for approval (usually 1-2 weeks)

#### Partnerize (Sportsbet)
- Website: [partnerize.com](https://partnerize.com)
- Covers: Sportsbet, others
- Revenue Share: 25-30%
- Note: More corporate, may require business verification

### Configuration
1. Open `/web/src/lib/config/affiliates.ts`
2. Replace placeholder affiliate IDs with your actual IDs:
   ```typescript
   affiliateId: 'YOUR_SPORTSBET_AFFILIATE_ID', // Replace this
   ```
3. Verify deep link patterns with each bookmaker's documentation
4. Set `enabled: true` for bookmakers you have agreements with

## 3. Deep Link Setup

### How Deep Links Work
Instead of sending users to just `sportsbet.com.au`, deep links take them directly to the bet slip:

```
https://www.sportsbet.com.au/racing/flemington-r1/runner/3?affiliate=YOUR_ID
```

### Generating Links
The `generateAffiliateLink()` function in `affiliates.ts` handles this automatically:

```typescript
generateAffiliateLink('sportsbet', 'flemington-r1', 3)
// Returns: https://www.sportsbet.com.au/racing/flemington-r1/runner/3?affiliate=YOUR_ID
```

### Testing
Before going live, test each link manually:
1. Click the generated link
2. Verify you land on the correct race/runner
3. Check that your affiliate tag appears in the URL
4. Place a small test bet to confirm tracking

## 4. Compliance (NSW Liquor & Gaming)

### Legal Requirements

#### 1. No Inducements
❌ **Never use these words:**
- "Bonus"
- "Free Bet"
- "Promo"
- "Sign-up Offer"

✅ **Use instead:**
- "Best Price"
- "Top Odds"
- "Compare Odds"

#### 2. BetStop Link (Mandatory)
The sticky footer includes:
- BetStop link: [betstop.gov.au](https://www.betstop.gov.au)
- Gambling Help link: [gamblinghelponline.org.au](https://www.gamblinghelponline.org.au)
- "18+" badge
- "Gamble Responsibly" message

#### 3. Age Verification
While not technically required for odds comparison (no account creation), it's good practice to include the 18+ messaging prominently.

## 5. API Integration (Next Steps)

### Replace Mock Data
Currently, the racing page uses mock data. To integrate with TheOddsAPI:

1. Create an API route at `/web/src/app/api/racing/route.ts`:
   ```typescript
   import { NextResponse } from 'next/server';

   export async function GET() {
     const apiKey = process.env.THEODDSAPI_KEY;
     const response = await fetch(
       `https://api.the-odds-api.com/v4/sports/horse_racing_australia/odds?apiKey=${apiKey}&regions=au&markets=h2h`,
       { next: { revalidate: 60 } } // Cache for 1 minute
     );
     const data = await response.json();
     return NextResponse.json(data);
   }
   ```

2. Update `/web/src/app/racing/page.tsx` to fetch from this endpoint instead of mock data.

### Data Structure
TheOddsAPI returns:
```json
{
  "id": "event_id",
  "sport_key": "horse_racing_australia",
  "sport_title": "Horse Racing",
  "commence_time": "2024-01-15T03:00:00Z",
  "home_team": "Flemington R1",
  "bookmakers": [
    {
      "key": "sportsbet",
      "markets": [
        {
          "key": "h2h",
          "outcomes": [
            { "name": "Runner 1", "price": 3.50 },
            { "name": "Runner 2", "price": 5.00 }
          ]
        }
      ]
    }
  ]
}
```

### Handling Scratchings
1. Filter out runners with odds > 100 (likely scratched)
2. Display a "Scratched" badge instead of odds
3. Update data every 60 seconds as race approaches

## 6. Revenue Model

### Expected Earnings

#### Conservative Estimate (100 clicks/day)
- Click-through rate: 10%
- Conversion rate: 5%
- Players per month: 15
- Avg. Revenue Share: 30%
- Avg. Customer Lifetime Value: $500
- **Monthly Revenue: ~$75-150**

#### Growth Estimate (1000 clicks/day)
- Players per month: 150
- **Monthly Revenue: ~$750-1500**

### Tips for Growth
1. **SEO**: Target "best odds [race name]" keywords
2. **Speed**: Show odds before official jump time
3. **Mobile**: 70% of racing punters use mobile
4. **Best Price Alerts**: Consider adding email/SMS alerts when odds improve

## 7. Folder Structure

```
web/
├── src/
│   ├── app/
│   │   ├── racing/
│   │   │   └── page.tsx          # Main racing page
│   │   └── api/
│   │       └── racing/
│   │           └── route.ts      # API endpoint (to create)
│   ├── lib/
│   │   └── config/
│   │       ├── affiliates.ts     # Affiliate configuration
│   │       └── sports.ts         # Sport config (includes racing)
│   └── components/
│       └── SportCard.tsx         # Card component (updated)
└── RACING_SETUP.md              # This file
```

## 8. Deployment Checklist

Before going live:
- [ ] Replace all `YOUR_*_AFFILIATE_ID` placeholders
- [ ] Test affiliate links for each bookmaker
- [ ] Verify compliance footer is visible
- [ ] Remove or update any promotional language
- [ ] Test on mobile devices
- [ ] Set up real TheOddsAPI integration
- [ ] Add error handling for API failures
- [ ] Implement rate limiting to avoid API quota issues
- [ ] Add analytics tracking for conversions

## 9. Maintenance

### Daily
- Monitor API quota usage
- Check for scratchings/late changes

### Weekly
- Review affiliate dashboard for conversions
- Analyze which bookmakers get most clicks
- Test deep links still work

### Monthly
- Review revenue vs. API costs
- Consider adding new bookmakers
- Update compliance footer if regulations change

## Support & Resources

- TheOddsAPI Docs: [the-odds-api.com/liveapi/guides/v4/](https://the-odds-api.com/liveapi/guides/v4/)
- NSW Gaming Regulations: [liquorandgaming.nsw.gov.au](https://www.liquorandgaming.nsw.gov.au)
- BetStop Information: [betstop.gov.au](https://www.betstop.gov.au)
- Commission Kings Support: Contact via their affiliate portal

## Questions?

For implementation questions, ask Claude to review specific files:
- "Show me how to integrate TheOddsAPI for racing"
- "Update the affiliate deep link pattern for Sportsbet"
- "Add error handling for scratched horses"
