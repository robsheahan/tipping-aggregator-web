/**
 * API Route: /api/racing
 * Fetches Australian horse racing odds from The Racing API
 */

import { NextResponse } from 'next/server';
import { getTodaysRacesWithOdds, isRacingAPIConfigured } from '@/lib/odds/providers/racingapi';

export async function GET() {
  try {
    // Check if Racing API is configured
    if (!isRacingAPIConfigured()) {
      return NextResponse.json(
        {
          error: 'Racing API not configured',
          message: 'Please set RACINGAPI_USERNAME and RACINGAPI_PASSWORD environment variables',
        },
        { status: 503 }
      );
    }

    console.log('Fetching Australian horse racing events from The Racing API...');

    // Fetch today's races with odds
    const races = await getTodaysRacesWithOdds();

    console.log(`Received ${races.length} racing events from The Racing API`);

    // Sort by start time
    races.sort((a, b) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    return NextResponse.json(races, {
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
