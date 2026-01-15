'use client';

/**
 * MultiGeneratorCard Component
 * Main display for the Master Multi Generator
 * Terminal aesthetic with auto-refresh
 */

import { useEffect, useState } from 'react';
import { MultiResponse, GeneratedMulti } from '@/lib/multi/types';
import MultiLegRow from './MultiLegRow';

type MultiType = 'triple' | 'nickel' | 'dime' | 'score';

const MULTI_LABELS: Record<MultiType, string> = {
  triple: 'Triple',
  nickel: 'Nickel',
  dime: 'Dime',
  score: 'Score',
};

const MULTI_DESCRIPTIONS: Record<MultiType, string> = {
  triple: '3 Legs',
  nickel: '5 Legs',
  dime: '10 Legs',
  score: '20 Legs',
};

export default function MultiGeneratorCard() {
  const [data, setData] = useState<MultiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<MultiType>('triple');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState(0);

  // Fetch multi data
  const fetchMultiData = async () => {
    try {
      setError(null);
      const response = await fetch('/api/multi-generator');

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const multiData = await response.json();
      setData(multiData);
      setLastUpdated(new Date());
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load multi data');
      setLoading(false);
    }
  };

  // Auto-refresh every 60 seconds
  useEffect(() => {
    fetchMultiData();

    const interval = setInterval(() => {
      fetchMultiData();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, []);

  // Update seconds counter
  useEffect(() => {
    if (!lastUpdated) return;

    const interval = setInterval(() => {
      const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
      setSecondsSinceUpdate(seconds);
    }, 1000);

    return () => clearInterval(interval);
  }, [lastUpdated]);

  // Get current multi based on selected tab
  const currentMulti: GeneratedMulti | undefined = data?.[selectedTab];

  // Loading state
  if (loading) {
    return (
      <div className="terminal-card p-8 mb-8">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-500 border-r-transparent"></div>
          <p className="mt-4 terminal-text">Generating multis...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="terminal-card p-8 mb-8">
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-6">
          <h3 className="text-lg font-semibold text-red-400 mb-2 font-mono">Error Loading Multis</h3>
          <p className="text-slate-300 font-mono text-sm">{error}</p>
          <button
            onClick={fetchMultiData}
            className="mt-4 px-4 py-2 bg-green-500/20 border border-green-500/30 text-green-400 rounded font-mono text-sm hover:bg-green-500/30 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No outcomes available
  if (data.totalOutcomesAvailable === 0) {
    return (
      <div className="terminal-card p-8 mb-8">
        <h2 className="terminal-header text-2xl mb-4">Master Multi Generator</h2>
        <div className="text-center py-8">
          <p className="terminal-text text-lg">No upcoming matches available</p>
          <p className="text-slate-500 text-sm mt-2 font-mono">Check back soon for new multis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="terminal-card p-6 md:p-8 mb-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="terminal-header text-2xl md:text-3xl">Master Multi Generator</h2>
          {lastUpdated && (
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${secondsSinceUpdate < 5 ? 'bg-green-500 animate-pulse' : 'bg-green-500/50'}`}></span>
              <span className="text-xs text-slate-500 font-mono">
                {secondsSinceUpdate}s ago
              </span>
            </div>
          )}
        </div>
        <p className="text-slate-400 text-sm font-mono">
          Automated probability-based multi bets across all sports
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {(Object.keys(MULTI_LABELS) as MultiType[]).map((type) => (
          <button
            key={type}
            onClick={() => setSelectedTab(type)}
            className={`multi-tab flex-shrink-0 ${
              selectedTab === type ? 'multi-tab-active' : ''
            }`}
          >
            <div className="font-bold">{MULTI_LABELS[type]}</div>
            <div className="text-xs opacity-70">{MULTI_DESCRIPTIONS[type]}</div>
          </button>
        ))}
      </div>

      {currentMulti && (
        <>
          {/* Warning Banner */}
          {currentMulti.warning && (
            <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-400 font-mono text-sm">⚠️ {currentMulti.warning}</p>
            </div>
          )}

          {/* Multi Success Score */}
          <div className="mb-6 p-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-2 border-green-500/30 rounded-xl">
            <div className="text-center">
              <div className="text-sm text-green-300 font-mono mb-2">Multi Success Score</div>
              <div className="text-5xl md:text-6xl font-bold text-green-400 font-mono">
                {(currentMulti.successProbability * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-slate-400 font-mono mt-3">
                Mathematical probability of all legs winning
              </div>
            </div>
          </div>

          {/* Legs List */}
          {currentMulti.legs.length > 0 ? (
            <div className="space-y-3 mb-6">
              {currentMulti.legs.map((leg, index) => (
                <MultiLegRow key={`${leg.sport}-${leg.homeTeam}-${leg.selection}-${index}`} leg={leg} index={index} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 font-mono text-sm">
              No legs available for this multi
            </div>
          )}

          {/* Footer: Bookmaker & Total Odds */}
          {currentMulti.legs.length > 0 && (
            <div className="mt-6 pt-6 border-t border-green-500/20">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Bookmaker */}
                <div>
                  <div className="text-xs text-slate-500 font-mono mb-1">Best Bookmaker</div>
                  <div className="inline-block px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
                    <span className="text-green-400 font-mono font-semibold">{currentMulti.bookmaker}</span>
                  </div>
                </div>

                {/* Total Odds & Payout */}
                <div className="text-right">
                  <div className="text-xs text-slate-500 font-mono mb-1">Total Multi Odds</div>
                  <div className="text-3xl font-bold text-green-400 font-mono">
                    ${currentMulti.totalOdds.toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-1">
                    $1 bet returns ${currentMulti.potentialPayout.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Compliance Footer */}
      <div className="mt-8 pt-6 border-t border-green-500/20">
        <p className="text-xs text-slate-400 text-center font-mono">
          Probabilities calculated by removing bookmaker margins from global market data.
        </p>
        <p className="text-xs text-slate-400 text-center font-mono mt-1">
          <span className="text-red-400">Gamble Responsibly. 18+.</span> Visit{' '}
          <a
            href="https://www.betsto.gov.au"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-400 hover:text-green-300 underline"
          >
            BetStop.gov.au
          </a>
        </p>
      </div>
    </div>
  );
}
