/**
 * API Route: POST /api/refresh-odds
 * Fetches fresh odds from TheOddsAPI (h2h, spreads, totals),
 * aggregates probabilities, calculates predicted scores,
 * and upserts results to Supabase sport_matches table.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSportConfig, SPORTS } from '@/lib/config/sports';
import {
  TheOddsAPIEvent,
  TheOddsAPIBookmaker,
} from '@/lib/odds/types';
import {
  decimalOddsToImpliedProbability,
  normalizeOdds2Way,
  normalizeOdds3Way,
} from '@/lib/odds/conversion';
import { aggregateProviderOdds } from '@/lib/odds/aggregation';
import { generateWeightMapForProviders, getDynamicWeights } from '@/lib/odds/weighting';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const BASE_URL = 'https://api.the-odds-api.com/v4';

interface RefreshRequest {
  league?: string; // 'AFL' | 'NRL' — omit to refresh all
}

/**
 * Fetch events from TheOddsAPI with h2h, spreads, and totals markets
 */
async function fetchEventsWithAllMarkets(
  sportKey: string,
  apiKey: string
): Promise<TheOddsAPIEvent[]> {
  const params = new URLSearchParams({
    apiKey,
    regions: 'au',
    markets: 'h2h,spreads,totals',
    oddsFormat: 'decimal',
  });

  const response = await fetch(
    `${BASE_URL}/sports/${sportKey}/odds?${params}`,
    { cache: 'no-store' }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `TheOddsAPI error (${sportKey}): ${response.status} — ${text}`
    );
  }

  return response.json();
}

/**
 * Extract median spread and total from bookmaker data
 */
function extractSpreadAndTotal(event: TheOddsAPIEvent): {
  homeSpread: number | null;
  awaySpread: number | null;
  totalPoints: number | null;
} {
  const spreads: number[] = [];
  const totals: number[] = [];

  for (const bm of event.bookmakers) {
    // Spreads market
    const spreadMarket = bm.markets.find((m) => m.key === 'spreads');
    if (spreadMarket) {
      const homeOutcome = spreadMarket.outcomes.find(
        (o) => o.name === event.home_team
      );
      if (homeOutcome && 'point' in homeOutcome) {
        spreads.push((homeOutcome as { point: number }).point);
      }
    }

    // Totals market
    const totalsMarket = bm.markets.find((m) => m.key === 'totals');
    if (totalsMarket) {
      const overOutcome = totalsMarket.outcomes.find(
        (o) => o.name === 'Over'
      );
      if (overOutcome && 'point' in overOutcome) {
        totals.push((overOutcome as { point: number }).point);
      }
    }
  }

  const median = (arr: number[]) => {
    if (arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const homeSpread = median(spreads);
  return {
    homeSpread,
    awaySpread: homeSpread !== null ? -homeSpread : null,
    totalPoints: median(totals),
  };
}

/**
 * Calculate predicted scores from spread and total
 * homeScore = (total - spread) / 2  (spread is from home perspective, negative = favoured)
 * awayScore = (total + spread) / 2
 */
function calculatePredictedScores(
  homeSpread: number | null,
  totalPoints: number | null
): {
  homePredicted: number | null;
  awayPredicted: number | null;
  predictedMargin: number | null;
} {
  if (homeSpread === null || totalPoints === null) {
    return { homePredicted: null, awayPredicted: null, predictedMargin: null };
  }

  // spread is from home perspective: negative means home favoured
  const homePredicted = (totalPoints - homeSpread) / 2;
  const awayPredicted = (totalPoints + homeSpread) / 2;
  const predictedMargin = Math.abs(homePredicted - awayPredicted);

  return { homePredicted, awayPredicted, predictedMargin };
}

/**
 * Build raw bookmaker odds array for storing in JSONB
 */
function buildBookmakerOddsJson(event: TheOddsAPIEvent) {
  return event.bookmakers.map((bm: TheOddsAPIBookmaker) => {
    const h2h = bm.markets.find((m) => m.key === 'h2h');
    const outcomes: Record<string, number> = {};
    if (h2h) {
      for (const o of h2h.outcomes) {
        outcomes[o.name] = o.price;
      }
    }
    return {
      bookmaker: bm.title,
      home: outcomes[event.home_team] ?? null,
      away: outcomes[event.away_team] ?? null,
      draw: outcomes['Draw'] ?? null,
      last_update: bm.last_update,
    };
  });
}

export async function POST(request: NextRequest) {
  // Validate env
  const apiKey = process.env.THEODDSAPI_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'THEODDSAPI_KEY not configured' },
      { status: 503 }
    );
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'Missing Supabase configuration' },
      { status: 503 }
    );
  }

  // Parse body
  let body: RefreshRequest = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Determine which leagues to refresh
  const leagueCodes = body.league
    ? [body.league.toUpperCase()]
    : Object.keys(SPORTS);

  // Validate leagues
  for (const code of leagueCodes) {
    if (!getSportConfig(code)) {
      return NextResponse.json(
        { error: `Unknown league: ${code}` },
        { status: 400 }
      );
    }
  }

  // Admin Supabase client (bypasses RLS)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  let totalUpdated = 0;
  const errors: string[] = [];

  for (const league of leagueCodes) {
    const config = getSportConfig(league)!;

    try {
      // Fetch accuracy data for dynamic weighting
      const { data: accuracyData } = await supabase
        .from('provider_accuracy')
        .select('*')
        .eq('provider_type', 'bookmaker')
        .eq('league', league);

      // Fetch with all three markets
      const events = await fetchEventsWithAllMarkets(config.theoddsapiKey, apiKey);
      console.log(`TheOddsAPI returned ${events.length} events for ${league}`);

      const now = new Date().toISOString();
      const marketType = config.marketType as '2way' | '3way';

      for (const event of events) {
        try {
          // 1. Extract & aggregate h2h probabilities
          const bookmakerOdds = event.bookmakers
            .map((bm) => {
              const h2h = bm.markets.find((m) => m.key === 'h2h');
              if (!h2h) return null;
              const outcomes: Record<string, number> = {};
              for (const o of h2h.outcomes) outcomes[o.name] = o.price;
              const home = outcomes[event.home_team];
              const away = outcomes[event.away_team];
              if (!home || !away) return null;
              return {
                bookmaker: bm.title,
                home,
                away,
                draw: outcomes['Draw'],
                last_update: bm.last_update,
              };
            })
            .filter(Boolean) as { bookmaker: string; home: number; away: number; draw?: number; last_update: string }[];

          let homeProb: number | null = null;
          let awayProb: number | null = null;
          let drawProb: number | null = null;
          let tip: string | null = null;
          let confidence: number | null = null;
          let contributingProviders = 0;

          if (bookmakerOdds.length > 0) {
            const providerOdds = bookmakerOdds.map((bo) => {
              const hp = decimalOddsToImpliedProbability(bo.home);
              const ap = decimalOddsToImpliedProbability(bo.away);
              const dp = bo.draw ? decimalOddsToImpliedProbability(bo.draw) : undefined;

              let normalized: { home: number; away: number; draw?: number };
              if (marketType === '3way' && dp !== undefined) {
                const [h, d, a] = normalizeOdds3Way(hp, dp, ap);
                normalized = { home: h, draw: d, away: a };
              } else {
                const [h, a] = normalizeOdds2Way(hp, ap);
                normalized = { home: h, away: a };
              }

              return {
                provider: bo.bookmaker,
                odds: { home: bo.home, away: bo.away, draw: bo.draw },
                probabilities: normalized,
                timestamp: bo.last_update,
              };
            });

            const providerIds = providerOdds.map((po) => po.provider);
            const weights = getDynamicWeights(providerIds, accuracyData || []);
            const aggregated = aggregateProviderOdds(providerOdds, weights, marketType);

            homeProb = aggregated.home_prob;
            awayProb = aggregated.away_prob;
            drawProb = aggregated.draw_prob ?? null;
            tip = aggregated.tip;
            confidence = aggregated.confidence;
            contributingProviders = aggregated.contributing_providers;
          }

          // 2. Extract spread & total
          const { homeSpread, awaySpread, totalPoints } = extractSpreadAndTotal(event);

          // 3. Calculate predicted scores
          const { homePredicted, awayPredicted, predictedMargin } =
            calculatePredictedScores(homeSpread, totalPoints);

          // 4. Upsert to Supabase
          const { error } = await supabase.from('sport_matches').upsert(
            {
              id: event.id,
              sport: config.theoddsapiSport,
              league,
              home_team: event.home_team,
              away_team: event.away_team,
              commence_time: event.commence_time,
              status: 'scheduled',
              home_prob: homeProb,
              away_prob: awayProb,
              draw_prob: drawProb,
              tip,
              confidence,
              home_spread: homeSpread,
              away_spread: awaySpread,
              total_points: totalPoints,
              home_predicted_score: homePredicted,
              away_predicted_score: awayPredicted,
              predicted_margin: predictedMargin,
              contributing_providers: contributingProviders,
              last_updated: now,
              bookmaker_odds: buildBookmakerOddsJson(event),
            },
            { onConflict: 'id' }
          );

          if (error) {
            console.error(`Upsert failed for ${event.id}:`, error);
            errors.push(`${event.home_team} vs ${event.away_team}: ${error.message}`);
          } else {
            totalUpdated++;
          }
        } catch (eventError) {
          const msg = eventError instanceof Error ? eventError.message : 'Unknown';
          errors.push(`${event.home_team} vs ${event.away_team}: ${msg}`);
        }
      }
    } catch (leagueError) {
      const msg = leagueError instanceof Error ? leagueError.message : 'Unknown';
      errors.push(`${league}: ${msg}`);
    }
  }

  return NextResponse.json({
    updated: totalUpdated,
    leagues: leagueCodes,
    errors: errors.length > 0 ? errors : undefined,
  });
}
