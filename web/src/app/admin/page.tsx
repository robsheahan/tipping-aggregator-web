'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ProviderAccuracyRow } from '@/lib/odds/types';

interface AccuracyResponse {
  providers: ProviderAccuracyRow[];
  weights: Record<string, Record<string, number>>;
  totalResults: number;
}

type LeagueFilter = 'ALL' | 'AFL' | 'NRL';

export default function AdminPage() {
  const [data, setData] = useState<AccuracyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leagueFilter, setLeagueFilter] = useState<LeagueFilter>('ALL');

  // Action button states
  const [updatingResults, setUpdatingResults] = useState(false);
  const [updateResultsMsg, setUpdateResultsMsg] = useState<string | null>(null);
  const [refreshingOdds, setRefreshingOdds] = useState(false);
  const [refreshOddsMsg, setRefreshOddsMsg] = useState<string | null>(null);

  const loadAccuracy = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/accuracy');
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accuracy data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccuracy();
  }, [loadAccuracy]);

  async function handleUpdateResults() {
    setUpdatingResults(true);
    setUpdateResultsMsg(null);
    try {
      const res = await fetch('/api/update-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      setUpdateResultsMsg(
        `Processed ${json.processed} result${json.processed !== 1 ? 's' : ''}, skipped ${json.skipped}`
      );
      // Reload accuracy data to reflect new results
      await loadAccuracy();
    } catch (err) {
      setUpdateResultsMsg(
        `Failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setUpdatingResults(false);
      setTimeout(() => setUpdateResultsMsg(null), 5000);
    }
  }

  async function handleRefreshOdds() {
    setRefreshingOdds(true);
    setRefreshOddsMsg(null);
    try {
      const res = await fetch('/api/refresh-odds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      setRefreshOddsMsg(
        `Updated ${json.updated} match${json.updated !== 1 ? 'es' : ''}`
      );
    } catch (err) {
      setRefreshOddsMsg(
        `Failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setRefreshingOdds(false);
      setTimeout(() => setRefreshOddsMsg(null), 5000);
    }
  }

  // Filter providers by league
  const filteredProviders = data
    ? leagueFilter === 'ALL'
      ? data.providers
      : data.providers.filter((p) => p.league === leagueFilter)
    : [];

  const bookmakers = filteredProviders.filter((p) => p.provider_type === 'bookmaker');
  const experts = filteredProviders.filter((p) => p.provider_type === 'expert');

  function brierColorClass(score: number | null): string {
    if (score === null) return 'text-slate-400';
    if (score < 0.3) return 'text-emerald-600 font-semibold';
    if (score <= 0.5) return 'text-amber-600 font-semibold';
    return 'text-red-600 font-semibold';
  }

  function getWeight(providerName: string, league: string): string | null {
    if (!data?.weights[league]) return null;
    const weight = data.weights[league][providerName];
    if (weight === undefined) return null;
    return (weight * 100).toFixed(1) + '%';
  }

  const LEAGUE_FILTERS: LeagueFilter[] = ['ALL', 'AFL', 'NRL'];

  // Spinner SVG component
  const Spinner = () => (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-4"
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
          Back to Home
        </Link>

        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Accuracy Leaderboard
            </h1>
            {data && (
              <p className="text-slate-600 mt-1">
                {data.totalResults} match{data.totalResults !== 1 ? 'es' : ''} scored
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleUpdateResults}
              disabled={updatingResults}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {updatingResults ? (
                <>
                  <Spinner />
                  Updating...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Update Results
                </>
              )}
            </button>
            <button
              onClick={handleRefreshOdds}
              disabled={refreshingOdds}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {refreshingOdds ? (
                <>
                  <Spinner />
                  Refreshing...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Refresh Odds
                </>
              )}
            </button>
          </div>
        </div>

        {/* Action feedback messages */}
        {updateResultsMsg && (
          <p
            className={`text-sm mb-2 ${
              updateResultsMsg.startsWith('Failed')
                ? 'text-red-600'
                : 'text-green-600'
            }`}
          >
            {updateResultsMsg}
          </p>
        )}
        {refreshOddsMsg && (
          <p
            className={`text-sm mb-2 ${
              refreshOddsMsg.startsWith('Failed')
                ? 'text-red-600'
                : 'text-green-600'
            }`}
          >
            {refreshOddsMsg}
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
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="mt-4 text-slate-600">Loading accuracy data...</p>
        </div>
      ) : !data || data.providers.length === 0 ? (
        /* Empty state */
        <div className="card text-center py-12">
          <svg
            className="w-12 h-12 text-slate-300 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            No accuracy data yet
          </h3>
          <p className="text-slate-600 max-w-md mx-auto">
            Click <strong>Update Results</strong> to fetch completed match scores
            and calculate provider accuracy metrics. Accuracy data is generated
            by comparing each provider&apos;s predictions against actual results.
          </p>
        </div>
      ) : (
        <>
          {/* League Filter */}
          <div className="flex items-center gap-2 mb-6">
            {LEAGUE_FILTERS.map((filter) => (
              <button
                key={filter}
                onClick={() => setLeagueFilter(filter)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  leagueFilter === filter
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {filter === 'ALL' ? 'All Leagues' : filter}
              </button>
            ))}
          </div>

          {/* Bookmaker Accuracy Table */}
          {bookmakers.length > 0 && (
            <div className="card mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">
                Bookmaker Accuracy
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-3 text-slate-500 font-semibold">
                        Rank
                      </th>
                      <th className="text-left py-3 px-3 text-slate-500 font-semibold">
                        Provider
                      </th>
                      <th className="text-left py-3 px-3 text-slate-500 font-semibold">
                        League
                      </th>
                      <th className="text-right py-3 px-3 text-slate-500 font-semibold">
                        Predictions
                      </th>
                      <th className="text-right py-3 px-3 text-slate-500 font-semibold">
                        Correct
                      </th>
                      <th className="text-right py-3 px-3 text-slate-500 font-semibold">
                        Accuracy %
                      </th>
                      <th className="text-right py-3 px-3 text-slate-500 font-semibold">
                        Brier Score
                      </th>
                      <th className="text-right py-3 px-3 text-slate-500 font-semibold">
                        Current Weight
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookmakers.map((provider, index) => (
                      <tr
                        key={`${provider.provider_name}-${provider.league}`}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-3 px-3 text-slate-900 font-medium">
                          {index + 1}
                        </td>
                        <td className="py-3 px-3 text-slate-900">
                          <div className="flex items-center gap-2">
                            {provider.provider_name}
                            {provider.total_predictions < 20 && (
                              <span className="badge badge-warning text-[10px] py-0.5 px-2">
                                Pending
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="badge badge-neutral">
                            {provider.league}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right text-slate-700">
                          {provider.total_predictions}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-700">
                          {provider.total_correct}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-900 font-medium">
                          {provider.accuracy_pct !== null
                            ? (provider.accuracy_pct * 100).toFixed(1) + '%'
                            : '—'}
                        </td>
                        <td
                          className={`py-3 px-3 text-right ${brierColorClass(
                            provider.brier_score_avg
                          )}`}
                        >
                          {provider.brier_score_avg !== null
                            ? provider.brier_score_avg.toFixed(4)
                            : '—'}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-700">
                          {getWeight(provider.provider_name, provider.league) || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Expert Accuracy Table */}
          {experts.length > 0 && (
            <div className="card">
              <h2 className="text-xl font-bold text-slate-900 mb-4">
                Expert Accuracy
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-3 text-slate-500 font-semibold">
                        Rank
                      </th>
                      <th className="text-left py-3 px-3 text-slate-500 font-semibold">
                        Source
                      </th>
                      <th className="text-left py-3 px-3 text-slate-500 font-semibold">
                        League
                      </th>
                      <th className="text-right py-3 px-3 text-slate-500 font-semibold">
                        Predictions
                      </th>
                      <th className="text-right py-3 px-3 text-slate-500 font-semibold">
                        Correct
                      </th>
                      <th className="text-right py-3 px-3 text-slate-500 font-semibold">
                        Accuracy %
                      </th>
                      <th className="text-right py-3 px-3 text-slate-500 font-semibold">
                        Brier Score
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {experts.map((provider, index) => (
                      <tr
                        key={`${provider.provider_name}-${provider.league}`}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-3 px-3 text-slate-900 font-medium">
                          {index + 1}
                        </td>
                        <td className="py-3 px-3 text-slate-900">
                          <div className="flex items-center gap-2">
                            {provider.provider_name}
                            {provider.total_predictions < 20 && (
                              <span className="badge badge-warning text-[10px] py-0.5 px-2">
                                Pending
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="badge badge-neutral">
                            {provider.league}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right text-slate-700">
                          {provider.total_predictions}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-700">
                          {provider.total_correct}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-900 font-medium">
                          {provider.accuracy_pct !== null
                            ? (provider.accuracy_pct * 100).toFixed(1) + '%'
                            : '—'}
                        </td>
                        <td
                          className={`py-3 px-3 text-right ${brierColorClass(
                            provider.brier_score_avg
                          )}`}
                        >
                          {provider.brier_score_avg !== null
                            ? provider.brier_score_avg.toFixed(4)
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* No results for current filter */}
          {bookmakers.length === 0 && experts.length === 0 && (
            <div className="card text-center py-12">
              <p className="text-slate-600">
                No accuracy data for {leagueFilter} yet.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
