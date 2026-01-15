'use client';

/**
 * MultiGeneratorCard Component
 * Main display for the Master Multi Generator
 * Features: Sport filtering, Custom bookmaker selection
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { MultiResponse, GeneratedMulti, MultiOutcome } from '@/lib/multi/types';
import { generateAllMultis, selectBestBookmakerForMulti, generateMulti } from '@/lib/multi/generator';
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

// All available sports
const ALL_SPORTS = [
  { code: 'EPL', name: 'Premier League', icon: '⚽' },
  { code: 'LA_LIGA', name: 'La Liga', icon: '⚽' },
  { code: 'BUNDESLIGA', name: 'Bundesliga', icon: '⚽' },
  { code: 'SERIE_A', name: 'Serie A', icon: '⚽' },
  { code: 'LIGUE_1', name: 'Ligue 1', icon: '⚽' },
  { code: 'UEFA_CHAMPIONS', name: 'Champions League', icon: '⚽' },
  { code: 'UEFA_EUROPA', name: 'Europa League', icon: '⚽' },
  { code: 'AFL', name: 'AFL', icon: '🏉' },
  { code: 'NRL', name: 'NRL', icon: '🏉' },
  { code: 'NFL', name: 'NFL', icon: '🏈' },
  { code: 'NCAAF', name: 'NCAA Football', icon: '🏈' },
  { code: 'NBA', name: 'NBA', icon: '🏀' },
  { code: 'NCAAB', name: 'NCAA Basketball', icon: '🏀' },
  { code: 'MLB', name: 'MLB', icon: '⚾' },
  { code: 'NHL', name: 'NHL', icon: '🏒' },
  { code: 'RUGBY_UNION', name: 'Rugby Union', icon: '🏉' },
  { code: 'RUGBY_LEAGUE', name: 'Rugby League', icon: '🏉' },
  { code: 'UFC', name: 'UFC/MMA', icon: '🥊' },
  { code: 'BOXING', name: 'Boxing', icon: '🥊' },
  { code: 'CRICKET', name: 'Cricket', icon: '🏏' },
];

export default function MultiGeneratorCard() {
  // Data state
  const [allOutcomes, setAllOutcomes] = useState<MultiOutcome[]>([]);
  const [data, setData] = useState<MultiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [selectedTab, setSelectedTab] = useState<MultiType>('triple');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState(0);

  // Filter state
  const [selectedSports, setSelectedSports] = useState<string[]>(ALL_SPORTS.map(s => s.code));
  const [selectedBookmaker, setSelectedBookmaker] = useState<string | null>(null); // null = best bookmaker
  const [showSportFilter, setShowSportFilter] = useState(false);
  const [showBookmakerSelector, setShowBookmakerSelector] = useState(false);

  // Refs for click-outside detection
  const sportFilterRef = useRef<HTMLDivElement>(null);
  const bookmakerSelectorRef = useRef<HTMLDivElement>(null);

  // Fetch multi data from API
  const fetchMultiData = async () => {
    try {
      setError(null);
      const response = await fetch('/api/multi-generator');

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const apiData = await response.json();

      // Store all outcomes
      setAllOutcomes(apiData.allOutcomes || []);

      // Store initial multi data
      setData({
        triple: apiData.triple,
        nickel: apiData.nickel,
        dime: apiData.dime,
        score: apiData.score,
        totalOutcomesAvailable: apiData.totalOutcomesAvailable,
        lastUpdated: apiData.lastUpdated,
      });

      setLastUpdated(new Date());
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load multi data');
      setLoading(false);
    }
  };

  // Create empty multi
  const createEmptyMulti = useCallback((type: MultiType, size: number): GeneratedMulti => ({
    type,
    size,
    legs: [],
    bookmaker: 'None',
    totalOdds: 0,
    successProbability: 0,
    potentialPayout: 0,
    lastUpdated: new Date().toISOString(),
    warning: 'No matches available for selected sports',
  }), []);

  // Helper to find match ID from leg
  const findMatchId = useCallback((leg: any): string => {
    const outcome = allOutcomes.find(
      o => o.homeTeam === leg.homeTeam && o.awayTeam === leg.awayTeam
    );
    return outcome?.matchId || '';
  }, [allOutcomes]);

  // Recalculate multi for a specific bookmaker
  const recalculateMultiForBookmaker = useCallback((multi: GeneratedMulti, bookmaker: string): GeneratedMulti => {
    if (multi.legs.length === 0) return multi;

    let totalOdds = 1.0;
    let hasAllOdds = true;

    // Map legs to find bookmaker odds
    const updatedLegs = multi.legs.map(leg => {
      // Find the original outcome to get bookmaker odds
      const outcome = allOutcomes.find(
        o => o.matchId === findMatchId(leg) && o.selection === leg.selection
      );

      if (!outcome || !outcome.bookmakerOdds[bookmaker]) {
        hasAllOdds = false;
        return leg;
      }

      const odds = outcome.bookmakerOdds[bookmaker];
      totalOdds *= odds;

      return {
        ...leg,
        odds,
      };
    });

    if (!hasAllOdds) {
      return {
        ...multi,
        warning: `${bookmaker} doesn't have odds for all legs`,
      };
    }

    return {
      ...multi,
      legs: updatedLegs,
      bookmaker,
      totalOdds,
      potentialPayout: totalOdds,
      lastUpdated: new Date().toISOString(),
      warning: undefined,
    };
  }, [allOutcomes, findMatchId]);

  // Regenerate multis based on sport filter and bookmaker selection
  const regenerateMultis = useCallback(() => {
    if (allOutcomes.length === 0) return;

    // Filter outcomes by selected sports
    const filteredOutcomes = allOutcomes.filter(outcome =>
      selectedSports.includes(outcome.sport)
    );

    if (filteredOutcomes.length === 0) {
      // No outcomes available for selected sports
      setData({
        triple: createEmptyMulti('triple', 3),
        nickel: createEmptyMulti('nickel', 5),
        dime: createEmptyMulti('dime', 10),
        score: createEmptyMulti('score', 20),
        totalOutcomesAvailable: 0,
        lastUpdated: new Date().toISOString(),
      });
      return;
    }

    // Generate multis with filtered outcomes
    let newMultis = generateAllMultis(filteredOutcomes);

    // If a specific bookmaker is selected, recalculate odds for that bookmaker
    if (selectedBookmaker) {
      newMultis = {
        triple: recalculateMultiForBookmaker(newMultis.triple, selectedBookmaker),
        nickel: recalculateMultiForBookmaker(newMultis.nickel, selectedBookmaker),
        dime: recalculateMultiForBookmaker(newMultis.dime, selectedBookmaker),
        score: recalculateMultiForBookmaker(newMultis.score, selectedBookmaker),
        totalOutcomesAvailable: filteredOutcomes.length,
        lastUpdated: new Date().toISOString(),
      };
    }

    setData(newMultis);
  }, [allOutcomes, selectedSports, selectedBookmaker, createEmptyMulti, recalculateMultiForBookmaker]);

  // Get all available bookmakers from current multi
  const getAvailableBookmakers = (): string[] => {
    const currentMulti = data?.[selectedTab];
    if (!currentMulti || currentMulti.legs.length === 0) return [];

    // Find bookmakers that have odds for ALL legs
    const bookmakerSets = currentMulti.legs.map(leg => {
      const outcome = allOutcomes.find(
        o => o.matchId === findMatchId(leg) && o.selection === leg.selection
      );
      return outcome ? Object.keys(outcome.bookmakerOdds) : [];
    });

    // Find intersection of all bookmaker sets
    if (bookmakerSets.length === 0) return [];

    return bookmakerSets[0].filter(bookmaker =>
      bookmakerSets.every(set => set.includes(bookmaker))
    );
  };

  // Auto-refresh every 60 seconds
  useEffect(() => {
    fetchMultiData();

    const interval = setInterval(() => {
      fetchMultiData();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, []);

  // Regenerate multis when filters change
  useEffect(() => {
    if (allOutcomes.length > 0) {
      regenerateMultis();
    }
  }, [allOutcomes, selectedSports, selectedBookmaker, regenerateMultis]);

  // Update seconds counter
  useEffect(() => {
    if (!lastUpdated) return;

    const interval = setInterval(() => {
      const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
      setSecondsSinceUpdate(seconds);
    }, 1000);

    return () => clearInterval(interval);
  }, [lastUpdated]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close sport filter dropdown
      if (sportFilterRef.current && !sportFilterRef.current.contains(event.target as Node)) {
        setShowSportFilter(false);
      }
      // Close bookmaker selector dropdown
      if (bookmakerSelectorRef.current && !bookmakerSelectorRef.current.contains(event.target as Node)) {
        setShowBookmakerSelector(false);
      }
    };

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);

    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get current multi based on selected tab
  const currentMulti: GeneratedMulti | undefined = data?.[selectedTab];

  // Loading state
  if (loading) {
    return (
      <div className="modern-card p-8 mb-8">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="mt-4 text-slate-600">Generating multis...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="modern-card p-8 mb-8">
        <div className="rounded-lg bg-red-50 border border-red-200 p-6">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Multis</h3>
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={fetchMultiData}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
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
      <div className="modern-card p-8 mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Master Multi Generator</h2>
        <div className="text-center py-8">
          <p className="text-slate-600 text-lg">No upcoming matches available</p>
          <p className="text-slate-400 text-sm mt-2">Check back soon for new multis</p>
        </div>
      </div>
    );
  }

  const availableBookmakers = getAvailableBookmakers();

  return (
    <div className="modern-card p-6 md:p-8 mb-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Master Multi Generator</h2>
          {lastUpdated && (
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${secondsSinceUpdate < 5 ? 'bg-indigo-600 animate-pulse' : 'bg-slate-400'}`}></span>
              <span className="text-xs text-slate-500">
                {secondsSinceUpdate}s ago
              </span>
            </div>
          )}
        </div>
        <p className="text-slate-600 text-sm">
          Automated probability-based multi bets across all sports
        </p>
      </div>

      {/* Tab Navigation + Sport Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Multi Type Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 flex-1">
          {(Object.keys(MULTI_LABELS) as MultiType[]).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedTab(type)}
              className={`modern-tab flex-shrink-0 px-6 py-3 rounded-lg transition-all ${
                selectedTab === type
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <div className="font-semibold">{MULTI_LABELS[type]}</div>
              <div className="text-xs opacity-75">{MULTI_DESCRIPTIONS[type]}</div>
            </button>
          ))}
        </div>

        {/* Sport Filter Dropdown */}
        <div className="relative" ref={sportFilterRef}>
          <button
            onClick={() => setShowSportFilter(!showSportFilter)}
            className="px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium text-slate-700"
          >
            <span>🏆</span>
            <span>Filter Sports</span>
            <span className="text-xs text-slate-500">
              ({selectedSports.length}/{ALL_SPORTS.length})
            </span>
          </button>

          {showSportFilter && (
            <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
              <div className="p-3 border-b border-slate-200 flex justify-between items-center">
                <span className="font-semibold text-slate-900">Select Sports</span>
                <button
                  onClick={() => setShowSportFilter(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              {/* Select All / None */}
              <div className="p-2 border-b border-slate-200 flex gap-2">
                <button
                  onClick={() => setSelectedSports(ALL_SPORTS.map(s => s.code))}
                  className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                >
                  Select All
                </button>
                <button
                  onClick={() => setSelectedSports([])}
                  className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
                >
                  Clear All
                </button>
              </div>

              {/* Sport List */}
              <div className="p-2">
                {ALL_SPORTS.map(sport => (
                  <label
                    key={sport.code}
                    className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSports.includes(sport.code)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSports([...selectedSports, sport.code]);
                        } else {
                          setSelectedSports(selectedSports.filter(s => s !== sport.code));
                        }
                      }}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-lg">{sport.icon}</span>
                    <span className="text-sm text-slate-700">{sport.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {currentMulti && (
        <>
          {/* Warning Banner */}
          {currentMulti.warning && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-amber-800 text-sm">⚠️ {currentMulti.warning}</p>
            </div>
          )}

          {/* Multi Success Score */}
          <div className="mb-6 p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl">
            <div className="text-center">
              <div className="text-sm text-indigo-700 font-semibold mb-2">Multi Success Score</div>
              <div className="text-5xl md:text-6xl font-bold text-indigo-900">
                {(currentMulti.successProbability * 100).toFixed(1)}%
              </div>
              <div className="mt-4 pt-4 border-t border-indigo-200">
                <div className="text-xs text-indigo-700 font-semibold mb-1">Total Payout</div>
                <div className="text-2xl md:text-3xl font-bold text-indigo-900">
                  ${currentMulti.potentialPayout.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-indigo-600 mt-1">on $1 bet</div>
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
            <div className="text-center py-8 text-slate-500 text-sm">
              No legs available for this multi
            </div>
          )}

          {/* Footer: Bookmaker & Total Odds */}
          {currentMulti.legs.length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Bookmaker Selector */}
                <div className="relative" ref={bookmakerSelectorRef}>
                  <div className="text-xs text-slate-500 mb-1">Bookmaker</div>
                  <button
                    onClick={() => setShowBookmakerSelector(!showBookmakerSelector)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 border border-indigo-200 rounded-lg hover:bg-indigo-200 transition-colors cursor-pointer"
                  >
                    <span className="text-indigo-900 font-semibold">{currentMulti.bookmaker}</span>
                    <span className="text-indigo-600 text-xs">▼</span>
                  </button>

                  {showBookmakerSelector && availableBookmakers.length > 0 && (
                    <div className="absolute left-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                      <div className="p-2">
                        {/* Best Bookmaker Option */}
                        <button
                          onClick={() => {
                            setSelectedBookmaker(null);
                            setShowBookmakerSelector(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded text-sm ${
                            selectedBookmaker === null
                              ? 'bg-indigo-100 text-indigo-900 font-semibold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          Best Odds (Auto)
                        </button>

                        <div className="border-t border-slate-200 my-2"></div>

                        {/* Individual Bookmakers */}
                        {availableBookmakers.map(bookmaker => (
                          <button
                            key={bookmaker}
                            onClick={() => {
                              setSelectedBookmaker(bookmaker);
                              setShowBookmakerSelector(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded text-sm ${
                              selectedBookmaker === bookmaker
                                ? 'bg-indigo-100 text-indigo-900 font-semibold'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {bookmaker}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Total Odds & Payout */}
                <div className="text-right">
                  <div className="text-xs text-slate-500 mb-1">Total Multi Odds</div>
                  <div className="text-3xl font-bold text-indigo-900">
                    ${currentMulti.totalOdds.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    $1 bet returns ${currentMulti.potentialPayout.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Compliance Footer */}
      <div className="mt-8 pt-6 border-t border-slate-200">
        <p className="text-xs text-slate-500 text-center">
          Probabilities calculated by removing bookmaker margins from global market data.
        </p>
        <p className="text-xs text-slate-500 text-center mt-1">
          <span className="text-red-600 font-semibold">Gamble Responsibly. 18+.</span> Visit{' '}
          <a
            href="https://www.betstop.gov.au"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-700 underline"
          >
            BetStop.gov.au
          </a>
        </p>
      </div>
    </div>
  );
}
