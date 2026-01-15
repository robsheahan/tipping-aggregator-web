/**
 * API Route: /api/racing
 * Fetches horse racing data with AI consensus scores from Supabase
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET() {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          error: 'Supabase not configured',
          message: 'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables',
        },
        { status: 503 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching racing data from Supabase...');

    // Fetch today's races
    const { data: races, error: racesError } = await supabase
      .from('races')
      .select('*')
      .eq('status', 'upcoming')
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true });

    if (racesError) {
      console.error('Error fetching races:', racesError);
      throw new Error(`Failed to fetch races: ${racesError.message}`);
    }

    if (!races || races.length === 0) {
      console.log('No races found in database');
      return NextResponse.json([]);
    }

    console.log(`Found ${races.length} races`);

    // For each race, get consensus scores and odds
    const racesWithData = await Promise.all(
      races.map(async (race) => {
        // Fetch consensus scores for this race
        const { data: consensusScores, error: consensusError } = await supabase
          .from('consensus_scores')
          .select('*')
          .eq('race_id', race.id)
          .order('consensus_score', { ascending: false });

        if (consensusError) {
          console.error(`Error fetching consensus for race ${race.id}:`, consensusError);
        }

        // Fetch odds for this race
        const { data: raceOdds, error: oddsError } = await supabase
          .from('race_odds')
          .select('*')
          .eq('race_id', race.id);

        if (oddsError) {
          console.error(`Error fetching odds for race ${race.id}:`, oddsError);
        }

        // Group odds by runner
        const oddsMap: { [runnerNum: number]: { [bookmaker: string]: number } } = {};
        raceOdds?.forEach((odd) => {
          if (!oddsMap[odd.runner_number]) {
            oddsMap[odd.runner_number] = {};
          }
          oddsMap[odd.runner_number][odd.bookmaker] = odd.odds;
        });

        // Build runners with consensus data
        const runners = (race.runners || []).map((runner: any) => {
          const runnerConsensus = consensusScores?.find(
            (cs) => cs.runner_number === runner.number
          );

          const runnerOdds = oddsMap[runner.number] || {};

          // Find best odds
          let bestOdds = 0;
          let bestBookmaker = '';
          Object.entries(runnerOdds).forEach(([bookmaker, odds]) => {
            if (odds > bestOdds) {
              bestOdds = odds;
              bestBookmaker = bookmaker;
            }
          });

          return {
            number: runner.number,
            name: runner.name,
            jockey: runner.jockey,
            trainer: runner.trainer,
            weight: runner.weight,
            barrier: runner.barrier,
            odds: runnerOdds,
            bestOdds: bestOdds || runnerConsensus?.best_odds || 0,
            bestBookmaker: bestBookmaker || runnerConsensus?.best_bookmaker || '',
            consensusScore: runnerConsensus?.consensus_score || 0,
            numTips: runnerConsensus?.num_tips || 0,
            aiVerdict: runnerConsensus?.ai_verdict || '',
            tipBreakdown: runnerConsensus?.tip_breakdown || {},
          };
        });

        // Sort runners by consensus score
        runners.sort((a: any, b: any) => (b.consensusScore || 0) - (a.consensusScore || 0));

        return {
          id: race.id,
          venue: race.venue,
          raceNumber: race.race_number,
          raceName: race.race_name,
          startTime: race.start_time,
          distance: race.distance,
          raceClass: race.race_class,
          trackCondition: race.track_condition,
          weather: race.weather,
          status: race.status,
          runners,
        };
      })
    );

    console.log(`Returning ${racesWithData.length} races with full data`);

    return NextResponse.json(racesWithData, {
      headers: {
        // Cache for 1 minute since this is demo data
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
