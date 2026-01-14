'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { getMatch } from '@/lib/api';
import { MatchDetail } from '@/lib/types';
import {
  formatProbability,
  formatDateTime,
  formatConfidence,
  getTipColor,
} from '@/utils/formatting';

export default function MatchDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const matchId = params.id as string;
  const league = searchParams.get('league') || 'EPL';

  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMatch(matchId, league)
      .then((matchData) => {
        setMatch(matchData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [matchId, league]);

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
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
          <p className="font-semibold mb-2">Match Not Available</p>
          <p className="text-sm mb-4">
            {error || 'This match may have finished or is no longer available from our data provider.'}
          </p>
          <a
            href="/"
            className="inline-block bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded text-sm transition-colors"
          >
            ← Back to Matches
          </a>
        </div>
      </div>
    );
  }

  const tipDisplay =
    match.tip === 'home'
      ? match.home_team.name
      : match.tip === 'away'
      ? match.away_team.name
      : 'Draw';

  const hasDrawProb = match.draw_prob !== null && match.draw_prob !== undefined;

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
              <span>{match.league.name}</span>
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

        {/* Aggregated probabilities */}
        {match.home_prob !== null && (
          <>
            <div className={`grid ${hasDrawProb ? 'grid-cols-3' : 'grid-cols-2'} gap-4 pt-4 border-t border-gray-200`}>
              <div className="text-center">
                <div className="text-sm text-gray-500 mb-1">Home Win</div>
                <div className="text-2xl font-bold text-blue-600">
                  {formatProbability(match.home_prob)}
                </div>
              </div>

              {hasDrawProb && (
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
                  Aggregated from {match.contributing_providers} bookmaker
                  {match.contributing_providers !== 1 ? 's' : ''}
                  {match.last_updated && (
                    <> • Last updated {formatDateTime(match.last_updated)}</>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {match.home_prob === null && (
          <div className="pt-4 border-t border-gray-200 text-center text-gray-500">
            Odds not available yet
          </div>
        )}
      </div>

      {/* Bookmaker odds breakdown */}
      {match.provider_odds && match.provider_odds.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Bookmaker Odds
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bookmaker
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Home
                  </th>
                  {hasDrawProb && (
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Draw
                    </th>
                  )}
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Away
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Updated
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {match.provider_odds.map((provider, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {provider.provider}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="text-sm text-gray-900">{provider.home_odds.toFixed(2)}</div>
                      <div className="text-xs text-gray-500">{formatProbability(provider.home_prob)}</div>
                    </td>
                    {hasDrawProb && (
                      <td className="px-4 py-3 text-center">
                        <div className="text-sm text-gray-900">{provider.draw_odds?.toFixed(2) || '-'}</div>
                        <div className="text-xs text-gray-500">
                          {provider.draw_prob !== undefined ? formatProbability(provider.draw_prob) : '-'}
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3 text-center">
                      <div className="text-sm text-gray-900">{provider.away_odds.toFixed(2)}</div>
                      <div className="text-xs text-gray-500">{formatProbability(provider.away_prob)}</div>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-gray-500">
                      {new Date(provider.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
