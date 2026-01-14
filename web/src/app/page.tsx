'use client';

import { useEffect, useState } from 'react';
import { getLeagues, getMatches } from '@/lib/api';
import { League, Match } from '@/lib/types';
import MatchCard from '@/components/MatchCard';

export default function Home() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<string>('EPL');
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch leagues on mount
    getLeagues()
      .then(setLeagues)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    // Fetch matches when league changes
    setLoading(true);
    setError(null);

    getMatches({ league: selectedLeague, upcoming_only: true })
      .then((data) => {
        setMatches(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [selectedLeague]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Upcoming Matches
        </h1>

        {/* League tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {['EPL', 'AFL', 'NRL'].map((league) => (
            <button
              key={league}
              onClick={() => setSelectedLeague(league)}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                selectedLeague === league
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {league}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md mb-4">
            Error: {error}
          </div>
        )}

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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {matches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
