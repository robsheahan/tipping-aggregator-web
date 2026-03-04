/**
 * API Route: /api/matches
 * Reads pre-aggregated match data from Supabase (populated by backend worker).
 * Falls back to live TheOddsAPI if no Supabase data exists.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSportConfig } from '@/lib/config/sports';
import { getTheOddsAPIClient } from '@/lib/odds/providers/theoddsapi';
import { aggregateProviderOdds } from '@/lib/odds/aggregation';
import { generateWeightMapForProviders } from '@/lib/odds/weighting';
import { generateRoundsFromMatches } from '@/lib/rounds/roundMappings';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const league = searchParams.get('league') || 'EPL';
  const upcomingOnly = searchParams.get('upcoming_only') !== 'false';
  const roundNumber = searchParams.get('round')
    ? parseInt(searchParams.get('round')!)
    : null;

  const sportConfig = getSportConfig(league);
  if (!sportConfig) {
    return NextResponse.json(
      { error: `Unknown league: ${league}` },
      { status: 400 }
    );
  }

  try {
    // Try Supabase first
    const matches = await fetchFromSupabase(league, upcomingOnly, roundNumber);
    if (matches && matches.length > 0) {
      return NextResponse.json(matches, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      });
    }

    // Fallback to live TheOddsAPI
    console.log(`No Supabase data for ${league}, falling back to TheOddsAPI`);
    const liveMatches = await fetchFromTheOddsAPI(league, sportConfig, upcomingOnly, roundNumber);
    return NextResponse.json(liveMatches, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('Error in /api/matches:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch matches', message: errorMessage, league },
      { status: 500 }
    );
  }
}

async function fetchFromSupabase(
  league: string,
  upcomingOnly: boolean,
  roundNumber: number | null
) {
  let query = supabase
    .from('sport_matches')
    .select('*')
    .eq('league', league)
    .order('commence_time', { ascending: true });

  if (upcomingOnly) {
    query = query.gte('commence_time', new Date().toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error('Supabase query error:', error);
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  // Filter by round if needed
  let rows = data;
  if (roundNumber !== null) {
    const rounds = generateRoundsFromMatches(
      rows.map(r => ({ id: r.id, commence_time: r.commence_time, home_team: r.home_team, away_team: r.away_team, bookmakers: [] })),
      league
    );
    const roundDef = rounds.find(r => r.roundNumber === roundNumber);
    if (roundDef) {
      rows = rows.filter(r => {
        const d = new Date(r.commence_time);
        return d >= roundDef.startDate && d <= roundDef.endDate;
      });
    }
  }

  // Transform to Match format
  return rows.map(row => ({
    id: row.id,
    home_team: { name: row.home_team },
    away_team: { name: row.away_team },
    league: { code: row.league, name: row.league, sport: row.sport },
    kickoff_time: row.commence_time,
    status: row.status || 'scheduled',
    home_prob: row.home_prob,
    away_prob: row.away_prob,
    draw_prob: row.draw_prob,
    tip: row.tip,
    confidence: row.confidence,
    contributing_providers: row.contributing_providers || 0,
    last_updated: row.last_updated,
    home_spread: row.home_spread,
    away_spread: row.away_spread,
    total_points: row.total_points,
    home_predicted_score: row.home_predicted_score,
    away_predicted_score: row.away_predicted_score,
    predicted_margin: row.predicted_margin,
  }));
}

async function fetchFromTheOddsAPI(
  league: string,
  sportConfig: ReturnType<typeof getSportConfig>,
  upcomingOnly: boolean,
  roundNumber: number | null
) {
  if (!sportConfig) return [];

  const sport = sportConfig.theoddsapiSport;
  const client = getTheOddsAPIClient();
  const events = await client.fetchMatches(sport, league);

  const now = new Date();
  let filteredEvents = upcomingOnly
    ? events.filter(e => new Date(e.commence_time) > now)
    : events;

  if (roundNumber !== null) {
    const rounds = generateRoundsFromMatches(filteredEvents, league);
    const roundDef = rounds.find(r => r.roundNumber === roundNumber);
    if (roundDef) {
      filteredEvents = filteredEvents.filter(e => {
        const matchDate = new Date(e.commence_time);
        return matchDate >= roundDef.startDate && matchDate <= roundDef.endDate;
      });
    }
  }

  const marketType = sportConfig.marketType as '2way' | '3way';

  return Promise.all(
    filteredEvents.map(async event => {
      try {
        const bookmakerOdds = client.extractBookmakerOdds(event);
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
          };
        }

        const providerOdds = client.convertToProviderOdds(bookmakerOdds, marketType);
        const providerIds = providerOdds.map(po => po.provider);
        const weights = generateWeightMapForProviders(providerIds, league, marketType);
        const aggregated = aggregateProviderOdds(providerOdds, weights, marketType);

        return {
          id: event.id,
          home_team: { name: event.home_team },
          away_team: { name: event.away_team },
          league: { code: league, name: league, sport },
          kickoff_time: event.commence_time,
          status: 'scheduled',
          ...aggregated,
        };
      } catch {
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
        };
      }
    })
  );
}
