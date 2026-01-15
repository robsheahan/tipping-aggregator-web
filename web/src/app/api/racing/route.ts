/**
 * API Route: /api/racing
 * Fetches Australian horse racing odds from TheOddsAPI
 */

import { NextResponse } from 'next/server';
import { getTheOddsAPIClient } from '@/lib/odds/providers/theoddsapi';

export async function GET() {
  try {
    // Get TheOddsAPI client (uses your existing API key)
    const client = getTheOddsAPIClient();

    console.log('Fetching Australian horse racing events...');

    // Fetch horse racing events
    // Note: TheOddsAPI uses 'horse_racing_australia' as the sport key
    const events = await client.fetchMatches('horse_racing', 'RACING');

    console.log(`Received ${events.length} racing events from TheOddsAPI`);

    // Transform to racing format
    const races = events.map(event => {
      // Parse venue and race number from event
      // TheOddsAPI format: "Flemington R1" or similar
      const [venue, raceInfo] = event.home_team.split(' R');
      const raceNumber = parseInt(raceInfo) || 1;

      // Extract runners from bookmakers
      const runners: any[] = [];
      const runnerOddsMap = new Map();

      // Aggregate odds from all bookmakers
      event.bookmakers?.forEach(bookmaker => {
        bookmaker.markets?.forEach(market => {
          if (market.key === 'h2h') {
            market.outcomes?.forEach((outcome, index) => {
              const runnerName = outcome.name;
              if (!runnerOddsMap.has(runnerName)) {
                runnerOddsMap.set(runnerName, {
                  number: index + 1,
                  name: runnerName,
                  odds: {},
                  bestOdds: 0,
                  bestBookmaker: '',
                });
              }

              const runner = runnerOddsMap.get(runnerName);
              runner.odds[bookmaker.key] = outcome.price;

              // Track best odds
              if (outcome.price > runner.bestOdds) {
                runner.bestOdds = outcome.price;
                runner.bestBookmaker = bookmaker.key;
              }
            });
          }
        });
      });

      // Convert map to array
      runners.push(...Array.from(runnerOddsMap.values()));

      return {
        id: event.id,
        venue: venue || 'Unknown Venue',
        raceNumber,
        startTime: event.commence_time,
        distance: '1200m', // TheOddsAPI doesn't provide distance, would need another source
        runners,
        status: new Date(event.commence_time) > new Date() ? 'upcoming' : 'resulted',
      };
    });

    // Filter to only upcoming races
    const upcomingRaces = races.filter(r => r.status === 'upcoming');

    // Sort by start time
    upcomingRaces.sort((a, b) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    return NextResponse.json(upcomingRaces, {
      headers: {
        // Cache for 1 minute - racing odds change frequently
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
      },
    });

  } catch (error) {
    console.error('Error in /api/racing:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error details:', {
      errorMessage,
      errorStack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch racing data',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
