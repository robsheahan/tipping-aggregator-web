/**
 * API Route: GET /api/admin/accuracy
 * Returns provider accuracy data and current dynamic weights
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getDynamicWeights } from '@/lib/odds/weighting';
import { ProviderAccuracyRow } from '@/lib/odds/types';

export async function GET() {
  try {
    const { data: accuracyData, error } = await supabase
      .from('provider_accuracy')
      .select('*')
      .order('brier_score_avg', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (accuracyData || []) as ProviderAccuracyRow[];

    // Calculate current weights per league
    const leagues = Array.from(new Set(rows.map((r) => r.league)));
    const weightsByLeague: Record<string, Record<string, number>> = {};

    for (const league of leagues) {
      const leagueBookmakers = rows.filter(
        (r) => r.league === league && r.provider_type === 'bookmaker'
      );
      const providerIds = leagueBookmakers.map((r) => r.provider_name);
      if (providerIds.length > 0) {
        weightsByLeague[league] = getDynamicWeights(providerIds, leagueBookmakers);
      }
    }

    // Get match result stats
    const { count: totalResults } = await supabase
      .from('match_results')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      providers: rows,
      weights: weightsByLeague,
      totalResults: totalResults || 0,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
