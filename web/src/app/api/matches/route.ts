/**
 * API Route: /api/matches
 * Fetches and aggregates live odds for matches
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTheOddsAPIClient } from '@/lib/odds/providers/theoddsapi';
import { aggregateProviderOdds } from '@/lib/odds/aggregation';
import { generateWeightMapForProviders } from '@/lib/odds/weighting';
import { getSportConfig } from '@/lib/config/sports';
import { generateRoundsFromMatches } from '@/lib/rounds/roundMappings';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const league = searchParams.get('league') || 'EPL';
  const upcomingOnly = searchParams.get('upcoming_only') !== 'false';
  const roundNumber = searchParams.get('round')
    ? parseInt(searchParams.get('round')!)
    : null;

  // Get sport config
  const sportConfig = getSportConfig(league);
  if (!sportConfig) {
    return NextResponse.json(
      { error: `Unknown league: ${league}` },
      { status: 400 }
    );
  }

  const sport = sportConfig.theoddsapiSport;

  try {

    // Get TheOddsAPI client
    const client = getTheOddsAPIClient();

    // Fetch matches
    console.log(`Fetching matches for sport: ${sport}, league: ${league}`);
    const events = await client.fetchMatches(sport, league);
    console.log(`Received ${events.length} events from TheOddsAPI`);

    // Filter upcoming matches if requested
    const now = new Date();
    let filteredEvents = upcomingOnly
      ? events.filter(e => new Date(e.commence_time) > now)
      : events;

    // Filter by round if specified
    if (roundNumber !== null) {
      // Generate rounds from all matches to determine date ranges
      const rounds = generateRoundsFromMatches(filteredEvents, league);
      const roundDef = rounds.find(r => r.roundNumber === roundNumber);

      if (roundDef) {
        filteredEvents = filteredEvents.filter(e => {
          const matchDate = new Date(e.commence_time);
          return matchDate >= roundDef.startDate && matchDate <= roundDef.endDate;
        });
      }
    }

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
          // At this point marketType is guaranteed to be '2way' or '3way' (racing filtered above)
          const marketType = sportConfig.marketType as '2way' | '3way';
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
        // Reduce cache time to 60 seconds so match IDs stay fresh
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('Error in /api/matches:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error details:', {
      league,
      sport,
      errorMessage,
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: 'Failed to fetch matches',
        message: errorMessage,
        league,
        sport,
      },
      { status: 500 }
    );
  }
}
