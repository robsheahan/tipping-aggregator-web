'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getMatch, getMatchSnapshots } from '@/lib/api';
import { Match, Snapshot } from '@/lib/types';
import ProbabilityChart from '@/components/ProbabilityChart';
import ProviderTable from '@/components/ProviderTable';
import {
  formatProbability,
  formatDateTime,
  formatConfidence,
  getTipColor,
} from '@/utils/formatting';

export default function MatchDetail() {
  const params = useParams();
  const matchId = parseInt(params.id as string);

  const [match, setMatch] = useState<Match | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getMatch(matchId), getMatchSnapshots(matchId, undefined, 200)])
      .then(([matchData, snapshotData]) => {
        setMatch(matchData);
        setSnapshots(snapshotData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [matchId]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        <p className="mt-4 text-gray-600">Loading match details...</p>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
        Error: {error || 'Match not found'}
      </div>
    );
  }

  const tipDisplay =
    match.tip === 'home'
      ? match.home_team.name
      : match.tip === 'away'
      ? match.away_team.name
      : 'Draw';

  return (
    <div>
      <div className="mb-6">
        <a href="/" className="text-blue-600 hover:text-blue-800 text-sm">
          ← Back to matches
        </a>
      </div>

      {/* Match header */}
      <div className="card mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {match.home_team.name} vs {match.away_team.name}
            </h1>
            <div className="flex gap-4 text-sm text-gray-600">
              <span>{match.league}</span>
              {match.round && <span>Round {match.round}</span>}
              <span>{formatDateTime(match.kickoff_time)}</span>
            </div>
          </div>
          <div className="text-right">
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                match.status === 'scheduled'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {match.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-1">Home Win</div>
            <div className="text-2xl font-bold text-blue-600">
              {formatProbability(match.home_prob)}
            </div>
          </div>

          {match.draw_prob !== null && match.draw_prob !== undefined && (
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">Draw</div>
              <div className="text-2xl font-bold text-yellow-600">
                {formatProbability(match.draw_prob)}
              </div>
            </div>
          )}

          <div className="text-center">
            <div className="text-sm text-gray-500 mb-1">Away Win</div>
            <div className="text-2xl font-bold text-red-600">
              {formatProbability(match.away_prob)}
            </div>
          </div>
        </div>

        {match.tip && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-gray-600">Tip: </span>
                <span className={`text-lg font-bold ${getTipColor(match.tip)}`}>
                  {tipDisplay}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Confidence</div>
                <div className="font-semibold">
                  {formatConfidence(match.confidence)}
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-500 mt-2">
              Based on {match.contributing_providers} provider
              {match.contributing_providers !== 1 ? 's' : ''}
              {match.last_updated && (
                <> • Last updated {formatDateTime(match.last_updated)}</>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Probability time series */}
      {snapshots.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Probability Over Time
          </h2>
          <ProbabilityChart snapshots={snapshots} />
        </div>
      )}

      {/* Provider snapshots table */}
      {snapshots.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Provider Snapshots
          </h2>
          <ProviderTable snapshots={snapshots} />
        </div>
      )}
    </div>
  );
}
