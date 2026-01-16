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
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [selectedBookmaker, setSelectedBookmaker] = useState<string | null>(null); // null = best bookmaker
  const [showSportFilter, setShowSportFilter] = useState(false);
  const [showBookmakerSelector, setShowBookmakerSelector] = useState(false);
  const [minTrueProbability, setMinTrueProbability] = useState(0.65); // Default 65% threshold
  const [selectionOffset, setSelectionOffset] = useState(0); // For "Generate New Multi" - skip top N selections

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

      // Store all outcomes - this will trigger regenerateMultis via useEffect
      // which will respect current selectedSports and selectedBookmaker
      setAllOutcomes(apiData.allOutcomes || []);

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
    let missingLegsCount = 0;

    // Map legs to find bookmaker odds
    const updatedLegs = multi.legs.map(leg => {
      // Find the original outcome to get bookmaker odds
      const outcome = allOutcomes.find(
        o => o.matchId === findMatchId(leg) && o.selection === leg.selection
      );

      if (!outcome || !outcome.bookmakerOdds[bookmaker]) {
        missingLegsCount++;
        // Keep original odds but mark as unavailable
        return leg;
      }

      const odds = outcome.bookmakerOdds[bookmaker];
      totalOdds *= odds;

      return {
        ...leg,
        odds,
        edge: outcome.edge, // Preserve edge value
      };
    });

    // If bookmaker doesn't have complete coverage, show warning
    const warning = missingLegsCount > 0
      ? `${bookmaker} doesn't have odds for ${missingLegsCount} ${missingLegsCount === 1 ? 'leg' : 'legs'}`
      : undefined;

    return {
      ...multi,
      legs: updatedLegs,
      bookmaker,
      totalOdds,
      potentialPayout: totalOdds,
      lastUpdated: new Date().toISOString(),
      warning,
    };
  }, [allOutcomes, findMatchId]);

  // Regenerate multis based on sport filter, TP threshold, and bookmaker selection
  const regenerateMultis = useCallback(() => {
    if (allOutcomes.length === 0) return;

    // Filter outcomes by selected sports AND minimum true probability
    const filteredOutcomes = allOutcomes.filter(outcome =>
      selectedSports.includes(outcome.sport) && outcome.trueProbability >= minTrueProbability
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

    // Apply selection offset (for "Generate New Multi" feature)
    // Skip the first N*selectionOffset outcomes to get different selections
    const offsetOutcomes = filteredOutcomes.slice(selectionOffset);

    // Generate multis with offset outcomes
    let newMultis = generateAllMultis(offsetOutcomes);

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
  }, [allOutcomes, selectedSports, selectedBookmaker, minTrueProbability, selectionOffset, createEmptyMulti, recalculateMultiForBookmaker]);

  // Get all available bookmakers from current multi
  const getAvailableBookmakers = (): string[] => {
    const currentMulti = data?.[selectedTab];
    if (!currentMulti || currentMulti.legs.length === 0) return [];

    // Get all unique bookmakers across all legs (not just those with complete coverage)
    const allBookmakers = new Set<string>();

    currentMulti.legs.forEach(leg => {
      const outcome = allOutcomes.find(
        o => o.matchId === findMatchId(leg) && o.selection === leg.selection
      );
      if (outcome) {
        Object.keys(outcome.bookmakerOdds).forEach(bookmaker => {
          allBookmakers.add(bookmaker);
        });
      }
    });

    // Sort bookmakers alphabetically
    return Array.from(allBookmakers).sort();
  };

  // Load saved preferences from localStorage on mount
  useEffect(() => {
    // Load saved sport selections
    const savedSports = localStorage.getItem('multiGenerator_selectedSports');
    if (savedSports) {
      try {
        const parsed = JSON.parse(savedSports);
        setSelectedSports(parsed);
      } catch (e) {
        // If parsing fails, default to all sports
        setSelectedSports(ALL_SPORTS.map(s => s.code));
      }
    } else {
      // No saved preferences, default to all sports
      setSelectedSports(ALL_SPORTS.map(s => s.code));
    }

    // Load saved TP threshold
    const savedThreshold = localStorage.getItem('multiGenerator_minTrueProbability');
    if (savedThreshold) {
      setMinTrueProbability(parseFloat(savedThreshold));
    }
  }, []);

  // Save sport selections to localStorage when they change
  useEffect(() => {
    if (selectedSports.length > 0) {
      localStorage.setItem('multiGenerator_selectedSports', JSON.stringify(selectedSports));
    }
  }, [selectedSports]);

  // Save TP threshold to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('multiGenerator_minTrueProbability', minTrueProbability.toString());
  }, [minTrueProbability]);

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
  }, [allOutcomes, selectedSports, selectedBookmaker, minTrueProbability, selectionOffset, regenerateMultis]);

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

  // No outcomes available - but still show UI with filters
  const hasNoOutcomes = !data || data.totalOutcomesAvailable === 0;

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

      {/* No outcomes message - shown when no sports selected or no data */}
      {hasNoOutcomes ? (
        <div className="mb-6 p-8 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="text-center">
            <p className="text-slate-600 text-lg mb-2">No matches available</p>
            {selectedSports.length === 0 ? (
              <p className="text-slate-500 text-sm">Please select at least one sport from the filter</p>
            ) : (
              <p className="text-slate-400 text-sm">No upcoming matches for selected sports</p>
            )}
          </div>
        </div>
      ) : currentMulti ? (
        <>
          {/* Warning Banner */}
          {currentMulti.warning && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-amber-800 text-sm">⚠️ {currentMulti.warning}</p>
            </div>
          )}

          {/* Total Payout & Multi Success Score */}
          <div className="mb-6 p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl">
            <div className="text-center">
              <div className="text-sm text-indigo-700 font-semibold mb-2">Total Payout</div>
              <div className="flex items-center justify-center gap-8 flex-wrap">
                {/* Generate New Multi - Left side */}
                <button
                  onClick={() => setSelectionOffset(prev => prev + 3)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors"
                  title="Skip current selections and generate new multi with similar odds"
                >
                  Generate New Multi
                </button>

                {/* Total Payout - Center */}
                <div className="text-5xl md:text-6xl font-bold text-indigo-900">
                  ${currentMulti.potentialPayout.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>

                {/* Higher Payout & Reset - Right side */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setMinTrueProbability(prev => prev - 0.05);
                      setSelectionOffset(0);
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
                    title="Lower probability threshold to include riskier bets with higher odds"
                  >
                    Higher Payout
                  </button>
                  {(minTrueProbability !== 0.65 || selectionOffset !== 0) && (
                    <button
                      onClick={() => {
                        setMinTrueProbability(0.65);
                        setSelectionOffset(0);
                      }}
                      className="px-4 py-2 text-sm bg-white border border-indigo-300 text-indigo-700 rounded hover:bg-indigo-50 transition-colors font-semibold"
                    >
                      Reset to Best Value
                    </button>
                  )}
                </div>
              </div>
              <div className="text-xs text-indigo-600 mt-2">on $1 bet</div>

              {/* Threshold indicator */}
              <div className="mt-3">
                <span className="text-xs text-indigo-700">
                  Min Win Probability: <span className="font-semibold">{(minTrueProbability * 100).toFixed(0)}%</span>
                </span>
              </div>

              <div className="mt-4 pt-4 border-t border-indigo-200">
                <div className="text-xs text-indigo-700 font-semibold mb-1">Multi Success Score</div>
                <div className="text-2xl md:text-3xl font-bold text-indigo-900">
                  {(currentMulti.successProbability * 100).toFixed(1)}%
                </div>
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
      ) : null}

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
