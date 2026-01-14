/**
 * API Route: /api/leagues
 * Returns list of supported leagues
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const leagues = [
    {
      id: 1,
      name: 'English Premier League',
      sport: 'soccer',
      code: 'EPL',
      country: 'England',
    },
    {
      id: 2,
      name: 'Australian Football League',
      sport: 'afl',
      code: 'AFL',
      country: 'Australia',
    },
    {
      id: 3,
      name: 'National Rugby League',
      sport: 'nrl',
      code: 'NRL',
      country: 'Australia',
    },
  ];

  return NextResponse.json(leagues, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
    },
  });
}
