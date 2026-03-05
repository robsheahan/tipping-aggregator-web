'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getMatches } from '@/lib/api';
import { Match } from '@/lib/types';
import { getSportConfig } from '@/lib/config/sports';
import MatchCard from '@/components/MatchCard';

export default function SportPage() {
  const params = useParams();
  const sportCode = (params.sportCode as string).toUpperCase();

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState<string | null>(null);

  // Get sport config
  const sportConfig = getSportConfig(sportCode);

  const loadMatches = useCallback(async () => {
    if (!sportConfig) return;
    try {
      setLoading(true);
      setError(null);
      const matchesData = await getMatches({
        league: sportCode,
        upcoming_only: true,
      });
      setMatches(matchesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load matches');
    } finally {
      setLoading(false);
    }
  }, [sportCode, sportConfig]);

  useEffect(() => {
    if (!sportConfig) {
      setError(`Unknown sport: ${sportCode}`);
      setLoading(false);
      return;
    }
    loadMatches();
  }, [sportConfig, sportCode, loadMatches]);

  async function handleRefreshOdds() {
    setRefreshing(true);
    setRefreshResult(null);
    try {
      const res = await fetch('/api/refresh-odds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ league: sportCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setRefreshResult(`Updated ${data.updated} match${data.updated !== 1 ? 'es' : ''}`);
      // Re-fetch matches to show updated data
      await loadMatches();
    } catch (err) {
      setRefreshResult(
        `Failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setRefreshing(false);
      // Clear result message after 5 seconds
      setTimeout(() => setRefreshResult(null), 5000);
    }
  }

  if (!sportConfig) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Sport Not Found</h1>
        <Link href="/" className="text-blue-600 hover:text-blue-800">
          Return to Homepage
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header with back button */}
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Sports
        </Link>

        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {sportConfig.displayName}
            </h1>
            <p className="text-gray-600">{sportConfig.name}</p>
          </div>
          <button
            onClick={handleRefreshOdds}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {refreshing ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Updating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Update Odds
              </>
            )}
          </button>
        </div>
        {refreshResult && (
          <p className={`text-sm mb-2 ${refreshResult.startsWith('Failed') ? 'text-red-600' : 'text-green-600'}`}>
            {refreshResult}
          </p>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md mb-6">
          Error: {error}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading matches...</p>
        </div>
      ) : matches.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-600">No upcoming matches found</p>
        </div>
      ) : (
        <>
          {/* Match count */}
          <div className="mb-4">
            <p className="text-gray-600">
              Showing {matches.length} {matches.length === 1 ? 'match' : 'matches'}
            </p>
          </div>

          {/* Match grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {matches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
