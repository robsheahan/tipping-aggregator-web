'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getMatches, getRounds } from '@/lib/api';
import { Match } from '@/lib/types';
import { getSportConfig } from '@/lib/config/sports';
import { RoundDefinition } from '@/lib/rounds/roundMappings';
import MatchCard from '@/components/MatchCard';
import RoundFilter from '@/components/RoundFilter';

export default function SportPage() {
  const params = useParams();
  const sportCode = (params.sportCode as string).toUpperCase();

  const [matches, setMatches] = useState<Match[]>([]);
  const [rounds, setRounds] = useState<RoundDefinition[]>([]);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [roundsLoaded, setRoundsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get sport config
  const sportConfig = getSportConfig(sportCode);

  // Load rounds once on mount
  useEffect(() => {
    if (!sportConfig) {
      setError(`Unknown sport: ${sportCode}`);
      setLoading(false);
      return;
    }

    async function loadRounds() {
      try {
        const roundsData = await getRounds(sportCode);
        setRounds(roundsData);
        setRoundsLoaded(true);

        // Auto-select the first (upcoming) round if available
        if (roundsData.length > 0) {
          setSelectedRound(roundsData[0].roundNumber);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load rounds');
        setLoading(false);
      }
    }

    loadRounds();
  }, [sportCode, sportConfig]);

  // Load matches when sport or selected round changes
  useEffect(() => {
    if (!sportConfig || !roundsLoaded) {
      return;
    }

    async function loadMatches() {
      try {
        setLoading(true);
        setError(null);

        const matchesData = await getMatches({
          league: sportCode,
          upcoming_only: true,
          round: selectedRound !== null ? selectedRound : undefined,
        });

        setMatches(matchesData);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load matches');
        setLoading(false);
      }
    }

    loadMatches();
  }, [sportCode, selectedRound, sportConfig, roundsLoaded]);

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

        <div className="flex items-center gap-4 mb-4">
          <span className="text-5xl">{sportConfig.icon}</span>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {sportConfig.displayName}
            </h1>
            <p className="text-gray-600">{sportConfig.name}</p>
          </div>
        </div>
      </div>

      {/* Round filter */}
      {rounds.length > 0 && (
        <RoundFilter
          rounds={rounds}
          selectedRound={selectedRound}
          onRoundChange={setSelectedRound}
          sportColor={sportConfig.color}
        />
      )}

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
          <p className="text-gray-600">
            {selectedRound !== null
              ? 'No matches found for this round'
              : 'No upcoming matches found'}
          </p>
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
