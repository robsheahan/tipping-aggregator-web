/**
 * API Route: /api/matches/[id]
 * Reads match detail + expert tips + consensus from Supabase.
 * Falls back to live TheOddsAPI if no Supabase data exists.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getTheOddsAPIClient } from '@/lib/odds/providers/theoddsapi';
import { aggregateProviderOdds } from '@/lib/odds/aggregation';
import { generateWeightMapForProviders, getDynamicWeights } from '@/lib/odds/weighting';
import { getSportConfig } from '@/lib/config/sports';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const eventId = params.id;
  const searchParams = request.nextUrl.searchParams;
  const league = searchParams.get('league') || 'EPL';

  const sportConfig = getSportConfig(league);
  if (!sportConfig) {
    return NextResponse.json(
      { error: `Unknown league: ${league}` },
      { status: 400 }
    );
  }

  try {
    // Try Supabase first
    const matchDetail = await fetchFromSupabase(eventId);
    if (matchDetail) {
      return NextResponse.json(matchDetail, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      });
    }

    // Fallback to live TheOddsAPI
    console.log(`Match ${eventId} not in Supabase, falling back to TheOddsAPI`);
    const liveMatch = await fetchFromTheOddsAPI(eventId, league, sportConfig);
    if (!liveMatch) {
      return NextResponse.json(
        { error: 'Match not found or has expired' },
        { status: 404 }
      );
    }

    return NextResponse.json(liveMatch, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error(`Error in /api/matches/[id] for event ${eventId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch match details', message: errorMessage },
      { status: 500 }
    );
  }
}

async function fetchFromSupabase(matchId: string) {
  // Fetch match
  const { data: match, error: matchError } = await supabase
    .from('sport_matches')
    .select('*')
    .eq('id', matchId)
    .single();

  if (matchError || !match) return null;

  // Fetch expert tips
  const { data: tips } = await supabase
    .from('sport_expert_tips')
    .select('*')
    .eq('match_id', matchId);

  // Fetch consensus
  const { data: consensus } = await supabase
    .from('sport_tip_consensus')
    .select('*')
    .eq('match_id', matchId)
    .single();

  // Build provider_odds from stored bookmaker JSON
  // Stored format uses 'home'/'away'/'draw' for odds values
  const bookmakerOdds = match.bookmaker_odds || [];
  const providerOdds = bookmakerOdds
    .filter((bm: Record<string, unknown>) => bm.home != null && bm.away != null)
    .map((bm: Record<string, unknown>) => {
      const homeOdds = bm.home as number;
      const awayOdds = bm.away as number;
      const drawOdds = bm.draw as number | undefined;
      const homeProb = 1 / homeOdds;
      const awayProb = 1 / awayOdds;
      const drawProb = drawOdds ? 1 / drawOdds : undefined;
      // Normalize probabilities
      const total = homeProb + awayProb + (drawProb || 0);
      return {
        provider: bm.bookmaker as string,
        home_prob: homeProb / total,
        away_prob: awayProb / total,
        draw_prob: drawProb ? drawProb / total : undefined,
        home_odds: homeOdds,
        away_odds: awayOdds,
        draw_odds: drawOdds,
        timestamp: bm.last_update as string,
      };
    });

  return {
    id: match.id,
    home_team: { name: match.home_team },
    away_team: { name: match.away_team },
    league: { code: match.league, name: match.league, sport: match.sport },
    kickoff_time: match.commence_time,
    status: match.status || 'scheduled',
    home_prob: match.home_prob,
    away_prob: match.away_prob,
    draw_prob: match.draw_prob,
    tip: match.tip,
    confidence: match.confidence,
    contributing_providers: match.contributing_providers || 0,
    last_updated: match.last_updated,
    home_spread: match.home_spread,
    away_spread: match.away_spread,
    total_points: match.total_points,
    home_predicted_score: match.home_predicted_score,
    away_predicted_score: match.away_predicted_score,
    predicted_margin: match.predicted_margin,
    provider_odds: providerOdds,
    expert_tips: (tips || []).map((t: Record<string, unknown>) => ({
      source: t.source,
      expert_name: t.expert_name,
      tipped_team: t.tipped_team,
      predicted_margin: t.predicted_margin,
      sport: t.sport,
    })),
    tip_consensus: consensus
      ? {
          home_tips: consensus.home_tips,
          away_tips: consensus.away_tips,
          total_tips: consensus.total_tips,
          consensus_team: consensus.consensus_team,
          consensus_pct: consensus.consensus_pct,
          consensus_strength: consensus.consensus_strength,
          avg_predicted_margin: consensus.avg_predicted_margin,
        }
      : null,
  };
}

async function fetchFromTheOddsAPI(
  eventId: string,
  league: string,
  sportConfig: ReturnType<typeof getSportConfig>
) {
  if (!sportConfig) return null;

  const sport = sportConfig.theoddsapiSport;
  const client = getTheOddsAPIClient();
  const allEvents = await client.fetchMatches(sport, league);
  const event = allEvents.find(e => e.id === eventId);

  if (!event) return null;

  // Fetch accuracy data for dynamic weighting
  const { data: accuracyData } = await supabase
    .from('provider_accuracy')
    .select('*')
    .eq('provider_type', 'bookmaker')
    .eq('league', league);

  const bookmakerOdds = client.extractBookmakerOdds(event);
  const predicted = client.extractPredictedScores(event);

  if (bookmakerOdds.length === 0) {
    return {
      id: event.id,
      home_team: { name: event.home_team },
      away_team: { name: event.away_team },
      league: { code: league, name: league, sport },
      kickoff_time: event.commence_time,
      status: 'scheduled',
      home_prob: null, away_prob: null, draw_prob: null,
      tip: null, confidence: null,
      contributing_providers: 0, last_updated: null,
      home_spread: predicted.homeSpread,
      away_spread: predicted.awaySpread,
      total_points: predicted.totalPoints,
      home_predicted_score: predicted.homePredictedScore,
      away_predicted_score: predicted.awayPredictedScore,
      predicted_margin: predicted.predictedMargin,
      provider_odds: [],
    };
  }

  const marketType = sportConfig.marketType as '2way' | '3way';
  const providerOdds = client.convertToProviderOdds(bookmakerOdds, marketType);
  const providerIds = providerOdds.map(po => po.provider);
  const weights = getDynamicWeights(providerIds, accuracyData || []);
  const aggregated = aggregateProviderOdds(providerOdds, weights, marketType);

  return {
    id: event.id,
    home_team: { name: event.home_team },
    away_team: { name: event.away_team },
    league: { code: league, name: league, sport },
    kickoff_time: event.commence_time,
    status: 'scheduled',
    ...aggregated,
    home_spread: predicted.homeSpread,
    away_spread: predicted.awaySpread,
    total_points: predicted.totalPoints,
    home_predicted_score: predicted.homePredictedScore,
    away_predicted_score: predicted.awayPredictedScore,
    predicted_margin: predicted.predictedMargin,
    provider_odds: providerOdds.map(po => ({
      provider: po.provider,
      home_prob: po.probabilities.home,
      away_prob: po.probabilities.away,
      draw_prob: po.probabilities.draw,
      home_odds: po.odds.home,
      away_odds: po.odds.away,
      draw_odds: po.odds.draw,
      timestamp: po.timestamp,
    })),
  };
}
