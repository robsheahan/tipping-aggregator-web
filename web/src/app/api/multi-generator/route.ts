/**
 * API Route: /api/multi-generator
 * Generates Triple/Nickel/Dime/Score multis across ALL sports
 */

import { NextResponse } from 'next/server';
import { getAllUpcomingOutcomes, generateAllMultis } from '@/lib/multi/generator';

export async function GET() {
  try {
    console.log('Generating Master Multis from ALL sports...');

    // Fetch all upcoming outcomes from ALL sports (within next 7 days)
    const outcomes = await getAllUpcomingOutcomes();
    console.log(`Found ${outcomes.length} total outcomes across all sports`);

    // Generate all 4 multi types
    const response = generateAllMultis(outcomes);

    console.log('Multi generation complete:', {
      triple: `${response.triple.legs.length} legs`,
      nickel: `${response.nickel.legs.length} legs`,
      dime: `${response.dime.legs.length} legs`,
      score: `${response.score.legs.length} legs`,
    });

    return NextResponse.json(response, {
      headers: {
        // Cache for 60 seconds, serve stale for 30s while revalidating
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
      },
    });
  } catch (error) {
    console.error('Error in /api/multi-generator:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to generate multis',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
