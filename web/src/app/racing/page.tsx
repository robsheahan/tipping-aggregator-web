'use client';

import { useEffect, useState } from 'react';

interface Runner {
  number: number;
  name: string;
  jockey?: string;
  trainer?: string;
  weight?: string;
  barrier?: number;
  odds: {
    [bookmaker: string]: number;
  };
  bestOdds: number;
  bestBookmaker: string;
  consensusScore?: number;
  numTips?: number;
  aiVerdict?: string;
  tipBreakdown?: { [source: string]: number };
}

interface Race {
  id: string;
  venue: string;
  raceNumber: number;
  raceName?: string;
  startTime: string;
  distance?: string;
  raceClass?: string;
  trackCondition?: string;
  weather?: string;
  status: 'upcoming' | 'live' | 'resulted';
  runners: Runner[];
}

export default function HorseRacingPage() {
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRacingData() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/racing');

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
        }

        const data = await response.json();
        setRaces(data);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load racing data');
        setLoading(false);
      }
    }

    loadRacingData();

    // Refresh every 60 seconds
    const interval = setInterval(loadRacingData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
            <p className="mt-4 text-slate-400">Loading racing data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="container mx-auto px-4 py-8">
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-6">
            <h3 className="text-lg font-semibold text-red-400 mb-2">Error Loading Data</h3>
            <p className="text-slate-300">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (races.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-white mb-8">🏇 Horse Racing</h1>
          <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-8 text-center">
            <p className="text-slate-400 text-lg">No races available at the moment.</p>
            <p className="text-slate-500 mt-2">Check back soon for upcoming races!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🏇 Horse Racing</h1>
          <p className="text-slate-400">AI-powered consensus scores from expert tipsters</p>
        </div>

        {/* Races */}
        <div className="space-y-8">
          {races.map((race) => (
            <div
              key={race.id}
              className="rounded-xl bg-slate-800/50 border border-slate-700 overflow-hidden"
            >
              {/* Race Header */}
              <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-slate-700 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">
                      {race.venue} - Race {race.raceNumber}
                    </h2>
                    {race.raceName && (
                      <p className="text-lg text-blue-300 mb-2">{race.raceName}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                      <span>📅 {new Date(race.startTime).toLocaleString()}</span>
                      {race.distance && <span>📏 {race.distance}</span>}
                      {race.raceClass && <span>🏆 {race.raceClass}</span>}
                      {race.trackCondition && <span>🌦️ {race.trackCondition}</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Runners */}
              <div className="divide-y divide-slate-700">
                {race.runners.map((runner, idx) => (
                  <div
                    key={runner.number}
                    className="p-6 hover:bg-slate-700/30 transition-colors"
                  >
                    {/* Runner Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm">
                            {runner.number}
                          </span>
                          <h3 className="text-xl font-bold text-white">{runner.name}</h3>
                          {idx === 0 && runner.consensusScore && runner.consensusScore > 80 && (
                            <span className="px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-semibold">
                              ⭐ TOP PICK
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                          {runner.jockey && <span>👤 {runner.jockey}</span>}
                          {runner.trainer && <span>🏋️ {runner.trainer}</span>}
                          {runner.weight && <span>⚖️ {runner.weight}</span>}
                          {runner.barrier && <span>🚪 Barrier {runner.barrier}</span>}
                        </div>
                      </div>
                    </div>

                    {/* AI Consensus Score */}
                    {runner.consensusScore !== undefined && runner.consensusScore > 0 && (
                      <div className="mb-4 p-4 rounded-lg bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-blue-300">
                            🤖 AI Consensus Score
                          </span>
                          <span className="text-2xl font-bold text-white">
                            {runner.consensusScore}/100
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden mb-2">
                          <div
                            className={`h-full transition-all ${
                              runner.consensusScore >= 80
                                ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                : runner.consensusScore >= 60
                                ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                                : runner.consensusScore >= 40
                                ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                                : 'bg-gradient-to-r from-red-500 to-pink-500'
                            }`}
                            style={{ width: `${runner.consensusScore}%` }}
                          ></div>
                        </div>
                        {runner.numTips && runner.numTips > 0 && (
                          <p className="text-xs text-slate-400">
                            Based on {runner.numTips} expert tip{runner.numTips > 1 ? 's' : ''}
                          </p>
                        )}
                        {/* AI Verdict */}
                        {runner.aiVerdict && (
                          <div className="mt-3 p-3 rounded-lg bg-slate-800/50 border border-slate-600">
                            <p className="text-sm text-slate-300 italic">
                              💬 &ldquo;{runner.aiVerdict}&rdquo;
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Odds */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-400">Best Odds</span>
                        {runner.bestOdds > 0 && (
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-400">
                              {runner.bestOdds.toFixed(2)}
                            </div>
                            <div className="text-xs text-slate-500">{runner.bestBookmaker}</div>
                          </div>
                        )}
                      </div>
                      {/* All Bookmaker Odds */}
                      {Object.keys(runner.odds).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(runner.odds).map(([bookmaker, odds]) => (
                            <div
                              key={bookmaker}
                              className={`px-3 py-2 rounded-lg ${
                                odds === runner.bestOdds
                                  ? 'bg-green-600/20 border border-green-500/30'
                                  : 'bg-slate-700/30 border border-slate-600'
                              }`}
                            >
                              <div className="text-xs text-slate-400">{bookmaker}</div>
                              <div className="text-lg font-bold text-white">{odds.toFixed(2)}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Tip Breakdown */}
                    {runner.tipBreakdown && Object.keys(runner.tipBreakdown).length > 0 && (
                      <div className="mt-4 p-3 rounded-lg bg-slate-800/30 border border-slate-600">
                        <p className="text-xs font-semibold text-slate-400 mb-2">Expert Tips:</p>
                        <div className="space-y-1">
                          {Object.entries(runner.tipBreakdown).map(([source, confidence]) => (
                            <div key={source} className="flex justify-between text-xs">
                              <span className="text-slate-400">{source}</span>
                              <span className="text-blue-400 font-semibold">{confidence}/100</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <div className="mt-8 p-4 rounded-lg bg-blue-600/10 border border-blue-500/20">
          <p className="text-sm text-slate-400 text-center">
            💡 AI consensus scores are generated by analyzing expert tipster opinions with Claude Sonnet 4.5
          </p>
        </div>
      </div>
    </div>
  );
}
