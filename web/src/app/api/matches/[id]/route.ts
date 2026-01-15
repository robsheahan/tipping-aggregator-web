/**
 * API Route: /api/matches/[id]
 * Fetches detailed odds for a specific match
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTheOddsAPIClient } from '@/lib/odds/providers/theoddsapi';
import { aggregateProviderOdds } from '@/lib/odds/aggregation';
import { generateWeightMapForProviders } from '@/lib/odds/weighting';
import { getSportConfig } from '@/lib/config/sports';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const eventId = params.id;
  const searchParams = request.nextUrl.searchParams;
  const league = searchParams.get('league') || 'EPL';

  // Get sport config
  const sportConfig = getSportConfig(league);
  if (!sportConfig) {
    return NextResponse.json(
      { error: `Unknown league: ${league}` },
      { status: 400 }
    );
  }

  // Racing events should use the /api/racing endpoint, not match details
  if (sportConfig.marketType === 'racing') {
    return NextResponse.json(
      { error: 'Racing events are not supported in match detail view' },
      { status: 400 }
    );
  }

  const sport = sportConfig.theoddsapiSport;

  try {
    // Get TheOddsAPI client
    const client = getTheOddsAPIClient();

    console.log(`Fetching match details for event ${eventId}, sport: ${sport}, league: ${league}`);

    // Fetch ALL matches for this sport and find the specific one
    // TheOddsAPI doesn't reliably support per-event endpoints, so we fetch all and filter
    const allEvents = await client.fetchMatches(sport, league);
    console.log(`Found ${allEvents.length} total events for ${sport}/${league}`);
    console.log(`Looking for event ID: ${eventId}`);
    console.log(`Available event IDs: ${allEvents.map(e => e.id).join(', ')}`);

    const event = allEvents.find(e => e.id === eventId);

    if (!event) {
      console.warn(`Match ${eventId} not found in TheOddsAPI results`);
      console.warn(`Searched among ${allEvents.length} events`);
      return NextResponse.json(
        {
          error: 'Match not found or has expired',
          message: `This match may have finished or is no longer available. Searched ${allEvents.length} events.`,
          requestedId: eventId,
          availableIds: allEvents.map(e => e.id).slice(0, 5)
        },
        { status: 404 }
      );
    }

    console.log(`Successfully found event: ${event.home_team} vs ${event.away_team}`);

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
    console.error(`Error in /api/matches/[id] for event ${eventId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error details:', {
      eventId,
      league,
      sport,
      errorMessage,
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: 'Failed to fetch match details',
        message: errorMessage,
        eventId,
        league,
        sport,
      },
      { status: 500 }
    );
  }
}
