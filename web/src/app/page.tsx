'use client';

import { useEffect, useState } from 'react';
import { getLeagues, getMatches } from '@/lib/api';
import { League } from '@/lib/types';
import SportCard from '@/components/SportCard';

interface SportWithCount extends League {
  matchCount: number;
}

export default function Home() {
  const [sports, setSports] = useState<SportWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSportsData() {
      try {
        setLoading(true);

        // Fetch all leagues
        const leagues = await getLeagues();

        // Fetch match counts for each league in parallel
        const sportsWithCounts = await Promise.all(
          leagues.map(async (league) => {
            try {
              const matches = await getMatches({
                league: league.code,
                upcoming_only: true,
              });
              return {
                ...league,
                matchCount: matches.length,
              };
            } catch (err) {
              console.error(`Error fetching matches for ${league.code}:`, err);
              return {
                ...league,
                matchCount: 0,
              };
            }
          })
        );

        setSports(sportsWithCounts);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sports');
        setLoading(false);
      }
    }

    loadSportsData();
  }, []);

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Sports Odds Aggregator
        </h1>
        <p className="text-lg text-gray-600">
          Select a sport to view upcoming matches and aggregated odds
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md mb-6">
          Error: {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading sports...</p>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {sports.map((sport) => (
            <SportCard
              key={sport.code}
              code={sport.code}
              name={sport.name}
              displayName={sport.displayName || sport.code}
              icon={sport.icon || '🏆'}
              color={sport.color || 'blue'}
              matchCount={sport.matchCount}
            />
          ))}
        </div>
      )}
    </div>
  );
}
