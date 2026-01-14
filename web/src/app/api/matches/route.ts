/**
 * API Route: /api/matches
 * Fetches and aggregates live odds for matches
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTheOddsAPIClient } from '@/lib/odds/providers/theoddsapi';
import { aggregateProviderOdds } from '@/lib/odds/aggregation';
import { generateWeightMapForProviders } from '@/lib/odds/weighting';

// League mapping for sport determination
const LEAGUE_SPORT_MAP: { [league: string]: string } = {
  EPL: 'soccer',
  AFL: 'afl',
  NRL: 'nrl',
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const league = searchParams.get('league') || 'EPL';
    const upcomingOnly = searchParams.get('upcoming_only') !== 'false';

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

    // Fetch matches
    console.log(`Fetching matches for sport: ${sport}, league: ${league}`);
    const events = await client.fetchMatches(sport, league);
    console.log(`Received ${events.length} events from TheOddsAPI`);

    // Filter upcoming matches if requested
    const now = new Date();
    const filteredEvents = upcomingOnly
      ? events.filter(e => new Date(e.commence_time) > now)
      : events;

    // Process each match
    const matches = await Promise.all(
      filteredEvents.map(async event => {
        try {
          // Extract bookmaker odds
          const bookmakerOdds = client.extractBookmakerOdds(event);

          if (bookmakerOdds.length === 0) {
            // No odds available yet
            return {
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
            };
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

          return {
            id: event.id,
            home_team: { name: event.home_team },
            away_team: { name: event.away_team },
            league: { code: league, name: league, sport },
            kickoff_time: event.commence_time,
            status: 'scheduled',
            ...aggregated,
          };
        } catch (error) {
          console.error(`Error processing match ${event.id}:`, error);
          // Return match without odds on error
          return {
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
          };
        }
      })
    );

    return NextResponse.json(matches, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Error in /api/matches:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error details:', {
      league,
      sport: LEAGUE_SPORT_MAP[league],
      errorMessage,
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: 'Failed to fetch matches',
        message: errorMessage,
        league,
        sport: LEAGUE_SPORT_MAP[league],
      },
      { status: 500 }
    );
  }
}
