/**
 * API Route: POST /api/update-results
 * Fetches completed match scores from TheOddsAPI,
 * records results, and updates provider accuracy metrics.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSportConfig, SPORTS } from '@/lib/config/sports';
import {
  determineWinner,
  calculateBrierScore2Way,
  oddsToNormalizedProbs,
  predictionCorrect,
} from '@/lib/odds/scoring';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const BASE_URL = 'https://api.the-odds-api.com/v4';

interface ScoresResponse {
  id: string;
  sport_key: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  completed: boolean;
  scores: Array<{ name: string; score: string }> | null;
  last_update: string | null;
}

async function fetchCompletedScores(
  sportKey: string,
  apiKey: string
): Promise<ScoresResponse[]> {
  const params = new URLSearchParams({
    apiKey,
    daysFrom: '3',
  });

  const response = await fetch(
    `${BASE_URL}/sports/${sportKey}/scores?${params}`,
    { cache: 'no-store' }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`TheOddsAPI scores error (${sportKey}): ${response.status} — ${text}`);
  }

  const events: ScoresResponse[] = await response.json();
  return events.filter((e) => e.completed && e.scores && e.scores.length >= 2);
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.THEODDSAPI_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'THEODDSAPI_KEY not configured' }, { status: 503 });
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 503 });
  }

  let body: { league?: string } = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const leagueCodes = body.league
    ? [body.league.toUpperCase()]
    : Object.keys(SPORTS);

  for (const code of leagueCodes) {
    if (!getSportConfig(code)) {
      return NextResponse.json({ error: `Unknown league: ${code}` }, { status: 400 });
    }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  let totalProcessed = 0;
  let totalSkipped = 0;
  const errors: string[] = [];

  for (const league of leagueCodes) {
    const config = getSportConfig(league)!;

    try {
      const completedEvents = await fetchCompletedScores(config.theoddsapiKey, apiKey);
      console.log(`Found ${completedEvents.length} completed events for ${league}`);

      for (const event of completedEvents) {
        try {
          // Check if already recorded
          const { data: existing } = await supabase
            .from('match_results')
            .select('id')
            .eq('match_id', event.id)
            .single();

          if (existing) {
            totalSkipped++;
            continue;
          }

          // Get the stored match data (with bookmaker_odds)
          const { data: matchData } = await supabase
            .from('sport_matches')
            .select('*')
            .eq('id', event.id)
            .single();

          if (!matchData) {
            continue; // Match not in our database
          }

          // Parse scores
          const homeScoreEntry = event.scores!.find((s) => s.name === event.home_team);
          const awayScoreEntry = event.scores!.find((s) => s.name === event.away_team);

          if (!homeScoreEntry || !awayScoreEntry) {
            errors.push(`${event.home_team} vs ${event.away_team}: Could not parse scores`);
            continue;
          }

          const homeScore = parseInt(homeScoreEntry.score, 10);
          const awayScore = parseInt(awayScoreEntry.score, 10);

          if (isNaN(homeScore) || isNaN(awayScore)) {
            errors.push(`${event.home_team} vs ${event.away_team}: Invalid score format`);
            continue;
          }

          const winner = determineWinner(homeScore, awayScore);
          const margin = Math.abs(homeScore - awayScore);

          // 1. Insert match result
          const { error: resultError } = await supabase.from('match_results').insert({
            match_id: event.id,
            league,
            home_score: homeScore,
            away_score: awayScore,
            winner,
            margin,
            completed_at: event.last_update || new Date().toISOString(),
          });

          if (resultError) {
            errors.push(`${event.home_team} vs ${event.away_team}: ${resultError.message}`);
            continue;
          }

          // 2. Update sport_matches status
          await supabase
            .from('sport_matches')
            .update({ status: 'completed' })
            .eq('id', event.id);

          // 3. Score bookmakers
          const bookmakerOdds = matchData.bookmaker_odds || [];
          for (const bm of bookmakerOdds as Array<Record<string, unknown>>) {
            const bookmakerName = bm.bookmaker as string;
            const homeOdds = bm.home as number | null;
            const awayOdds = bm.away as number | null;

            if (!bookmakerName || !homeOdds || !awayOdds) continue;

            const probs = oddsToNormalizedProbs(homeOdds, awayOdds);
            const brierScore = calculateBrierScore2Way(probs.home, probs.away, winner);
            const correct = predictionCorrect(probs.home, probs.away, winner);

            // Fetch existing accuracy record
            const { data: existingAcc } = await supabase
              .from('provider_accuracy')
              .select('*')
              .eq('provider_name', bookmakerName)
              .eq('provider_type', 'bookmaker')
              .eq('league', league)
              .single();

            const newTotal = (existingAcc?.total_predictions || 0) + 1;
            const newCorrect = (existingAcc?.total_correct || 0) + (correct ? 1 : 0);
            const newBrierSum = (existingAcc?.brier_score_sum || 0) + brierScore;

            await supabase.from('provider_accuracy').upsert(
              {
                provider_name: bookmakerName,
                provider_type: 'bookmaker',
                league,
                total_predictions: newTotal,
                total_correct: newCorrect,
                brier_score_sum: newBrierSum,
                brier_score_avg: newBrierSum / newTotal,
                accuracy_pct: newCorrect / newTotal,
                last_match_id: event.id,
                last_updated: new Date().toISOString(),
              },
              { onConflict: 'provider_name,provider_type,league' }
            );
          }

          // 4. Score expert tippers
          const { data: expertTips } = await supabase
            .from('sport_expert_tips')
            .select('*')
            .eq('match_id', event.id);

          if (expertTips && expertTips.length > 0) {
            for (const tip of expertTips) {
              const tipSource = tip.source as string;
              const tippedTeam = tip.tipped_team as string;

              // Determine if the expert tipped home or away
              let expertPredictedHome: number;
              let expertPredictedAway: number;

              if (tip.home_prob != null && tip.away_prob != null) {
                // Use stored probabilities if available
                expertPredictedHome = tip.home_prob;
                expertPredictedAway = tip.away_prob;
              } else {
                // Binary pick: assign high confidence to the tipped team
                if (tippedTeam === matchData.home_team) {
                  expertPredictedHome = 0.8;
                  expertPredictedAway = 0.2;
                } else if (tippedTeam === matchData.away_team) {
                  expertPredictedHome = 0.2;
                  expertPredictedAway = 0.8;
                } else {
                  continue; // Can't match team name
                }
              }

              const brierScore = calculateBrierScore2Way(
                expertPredictedHome,
                expertPredictedAway,
                winner
              );

              // Determine if correct
              let correct = false;
              if (tippedTeam === matchData.home_team && winner === 'home') correct = true;
              if (tippedTeam === matchData.away_team && winner === 'away') correct = true;

              const { data: existingAcc } = await supabase
                .from('provider_accuracy')
                .select('*')
                .eq('provider_name', tipSource)
                .eq('provider_type', 'expert')
                .eq('league', league)
                .single();

              const newTotal = (existingAcc?.total_predictions || 0) + 1;
              const newCorrect = (existingAcc?.total_correct || 0) + (correct ? 1 : 0);
              const newBrierSum = (existingAcc?.brier_score_sum || 0) + brierScore;

              await supabase.from('provider_accuracy').upsert(
                {
                  provider_name: tipSource,
                  provider_type: 'expert',
                  league,
                  total_predictions: newTotal,
                  total_correct: newCorrect,
                  brier_score_sum: newBrierSum,
                  brier_score_avg: newBrierSum / newTotal,
                  accuracy_pct: newCorrect / newTotal,
                  last_match_id: event.id,
                  last_updated: new Date().toISOString(),
                },
                { onConflict: 'provider_name,provider_type,league' }
              );
            }
          }

          totalProcessed++;
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
    processed: totalProcessed,
    skipped: totalSkipped,
    leagues: leagueCodes,
    errors: errors.length > 0 ? errors : undefined,
  });
}
