/**
 * API Route: /api/matches/[id]
 * Fetches detailed odds for a specific match
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTheOddsAPIClient } from '@/lib/odds/providers/theoddsapi';
import { aggregateProviderOdds } from '@/lib/odds/aggregation';
import { generateWeightMapForProviders } from '@/lib/odds/weighting';

// League mapping
const LEAGUE_SPORT_MAP: { [league: string]: string } = {
  EPL: 'soccer',
  AFL: 'afl',
  NRL: 'nrl',
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;
    const searchParams = request.nextUrl.searchParams;
    const league = searchParams.get('league') || 'EPL';

    // Get sport from league
    const sport = LEAGUE_SPORT_MAP[league];
    if (!sport) {
      return NextResponse.json(
        { error: `Unknown league: ${league}` },
        { status: 400 }
      );
    }

    // Get TheOddsAPI client
    const client = getTheOddsAPIClient();

    // Fetch match odds
    const event = await client.fetchMatchOdds(eventId, sport, league);

    if (!event) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }

    // Extract bookmaker odds
    const bookmakerOdds = client.extractBookmakerOdds(event);

    if (bookmakerOdds.length === 0) {
      // No odds available yet
      return NextResponse.json({
        id: event.id,
        home_team: { name: event.home_team },
        away_team: { name: event.away_team },
        league: { code: league, name: league, sport },
        kickoff_time: event.commence_time,
        status: 'scheduled',
        home_prob: null,
        away_prob: null,
        draw_prob: null,
        tip: null,
        confidence: null,
        contributing_providers: 0,
        last_updated: null,
        provider_odds: [],
      });
    }

    // Convert to provider odds format
    const marketType = sport === 'soccer' ? '3way' : '2way';
    const providerOdds = client.convertToProviderOdds(
      bookmakerOdds,
      marketType
    );

    // Generate weights (equal for all providers)
    const providerIds = providerOdds.map(po => po.provider);
    const weights = generateWeightMapForProviders(providerIds, league, marketType);

    // Aggregate odds
    const aggregated = aggregateProviderOdds(
      providerOdds,
      weights,
      marketType
    );

    return NextResponse.json(
      {
        id: event.id,
        home_team: { name: event.home_team },
        away_team: { name: event.away_team },
        league: { code: league, name: league, sport },
        kickoff_time: event.commence_time,
        status: 'scheduled',
        ...aggregated,
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
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.error('Error in /api/matches/[id]:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch match details',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
