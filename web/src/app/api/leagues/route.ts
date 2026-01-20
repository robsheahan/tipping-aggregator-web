/**
 * API Route: /api/leagues
 * Returns list of supported leagues
 */

import { NextResponse } from 'next/server';
import { getAllSports } from '@/lib/config/sports';

export async function GET() {
  // Generate leagues from sport config (AFL and NRL only)
  const leagues = getAllSports().map((sport, index) => ({
    id: index + 1,
    name: sport.name,
    sport: sport.theoddsapiSport,
    code: sport.code,
    country: 'Australia',
    icon: sport.icon,
    color: sport.color,
    displayName: sport.displayName,
  }));

  return NextResponse.json(leagues, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
    },
  });
}
