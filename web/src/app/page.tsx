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
      {/* Hero Section */}
      <div className="text-center mb-12 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium mb-6 ring-1 ring-inset ring-indigo-700/10">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Live odds from Australian bookmakers
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold text-slate-900 mb-6 tracking-tight">
          Master Your Sports
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
            Betting Strategy
          </span>
        </h1>

        <p className="text-xl text-slate-600 leading-relaxed">
          Aggregate probabilities from multiple bookmakers to make informed betting decisions across all major sports.
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-800 px-6 py-4 rounded-lg mb-8 shadow-sm">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="font-semibold mb-1">Error Loading Sports</h3>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Sports Grid */}
      {loading ? (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Available Sports</h2>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              Loading odds...
            </div>
          </div>
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SportCard
                key={i}
                code=""
                name=""
                displayName=""
                icon=""
                color="blue"
                matchCount={0}
                loading={true}
              />
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Available Sports</h2>
            <div className="text-sm text-slate-500">
              {sports.length} {sports.length === 1 ? 'sport' : 'sports'} with live odds
            </div>
          </div>
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
        </div>
      )}

      {/* Footer Note */}
      {!loading && sports.length > 0 && (
        <div className="mt-12 text-center">
          <p className="text-sm text-slate-500">
            Odds are aggregated from multiple Australian bookmakers and updated in real-time.
          </p>
        </div>
      )}
    </div>
  );
}
