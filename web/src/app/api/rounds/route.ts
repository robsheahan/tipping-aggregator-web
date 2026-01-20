/**
 * API Route: /api/rounds
 * Automatically generates round/week definitions by analyzing match dates
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTheOddsAPIClient } from '@/lib/odds/providers/theoddsapi';
import { getSportConfig } from '@/lib/config/sports';
import { generateRoundsFromMatches } from '@/lib/rounds/roundMappings';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const league = searchParams.get('league') || 'AFL';

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

    // Fetch all upcoming matches
    const events = await client.fetchMatches(sport, league);

    // Filter to upcoming only
    const now = new Date();
    const upcomingEvents = events.filter(e => new Date(e.commence_time) > now);

    // Generate rounds automatically from match dates
    const rounds = generateRoundsFromMatches(upcomingEvents, league);

    return NextResponse.json(rounds, {
      headers: {
        // Cache for 5 minutes - rounds don't change frequently
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Error in /api/rounds:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to fetch rounds',
        message: errorMessage,
        league,
      },
      { status: 500 }
    );
  }
}
