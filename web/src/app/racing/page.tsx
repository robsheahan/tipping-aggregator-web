'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Runner {
  number: number;
  name: string;
  odds: {
    [bookmaker: string]: number;
  };
  bestOdds: number;
  bestBookmaker: string;
}

interface Race {
  id: string;
  venue: string;
  raceNumber: number;
  startTime: string;
  distance: string;
  runners: Runner[];
  status: 'upcoming' | 'live' | 'resulted';
}

export default function HorseRacingPage() {
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<string | null>(null);

  useEffect(() => {
    async function loadRacingData() {
      try {
        setLoading(true);

        // Fetch from API route
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

  const filteredRaces = selectedVenue
    ? races.filter(r => r.venue === selectedVenue)
    : races;

  const venues = Array.from(new Set(races.map(r => r.venue)));

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-4 font-medium transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Sports
        </Link>

        <div className="mb-4">
          <h1 className="text-3xl font-bold text-slate-900">Australian Horse Racing</h1>
          <p className="text-slate-600">Compare odds across bookmakers and find the best prices</p>
        </div>

        {/* Compliance Notice */}
        <div className="bg-amber-50 border-l-4 border-amber-500 px-4 py-3 rounded-lg text-sm">
          <p className="text-amber-900">
            <strong>Best Price Guarantee:</strong> Odds shown below represent the highest available price for each runner.
            All links are direct to bookmaker sites. Never use promotions or bonuses. Gamble responsibly.
          </p>
        </div>
      </div>

      {/* Venue Filter */}
      {venues.length > 1 && (
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedVenue(null)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedVenue === null
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-indigo-200'
              }`}
            >
              All Venues
            </button>
            {venues.map(venue => (
              <button
                key={venue}
                onClick={() => setSelectedVenue(venue)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedVenue === venue
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-indigo-200'
                }`}
              >
                {venue}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-800 px-6 py-4 rounded-lg mb-8">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="font-semibold mb-1">Error Loading Races</h3>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading today's races...</p>
        </div>
      ) : filteredRaces.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-slate-200 p-12 text-center">
          <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Races Available</h3>
          <p className="text-slate-600">There are no upcoming races at the moment. Check back later.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredRaces.map(race => (
            <div key={race.id} className="bg-white rounded-xl border-2 border-slate-200 border-t-4 border-t-amber-500 overflow-hidden">
              {/* Race Header */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-slate-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      {race.venue} - Race {race.raceNumber}
                    </h3>
                    <p className="text-sm text-slate-600">{race.distance}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-600">Jump Time</div>
                    <div className="text-lg font-bold text-slate-900">
                      {new Date(race.startTime).toLocaleTimeString('en-AU', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Odds Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">#</th>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">Runner</th>
                      <th className="text-center px-4 py-3 text-sm font-semibold text-slate-700">Sportsbet</th>
                      <th className="text-center px-4 py-3 text-sm font-semibold text-slate-700">Ladbrokes</th>
                      <th className="text-center px-4 py-3 text-sm font-semibold text-slate-700">Neds</th>
                      <th className="text-center px-4 py-3 text-sm font-semibold text-slate-700 bg-emerald-50">Best</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {race.runners.map(runner => (
                      <tr key={runner.number} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-slate-900">{runner.number}</td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900">{runner.name}</div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            className={`px-4 py-2 rounded-lg font-bold transition-all ${
                              runner.bestBookmaker === 'sportsbet'
                                ? 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-500'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                            onClick={() => {
                              // TODO: Generate affiliate link
                              console.log('Navigate to Sportsbet:', race.id, runner.number);
                            }}
                          >
                            ${runner.odds.sportsbet.toFixed(2)}
                          </button>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            className={`px-4 py-2 rounded-lg font-bold transition-all ${
                              runner.bestBookmaker === 'ladbrokes'
                                ? 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-500'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                            onClick={() => {
                              console.log('Navigate to Ladbrokes:', race.id, runner.number);
                            }}
                          >
                            ${runner.odds.ladbrokes.toFixed(2)}
                          </button>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            className={`px-4 py-2 rounded-lg font-bold transition-all ${
                              runner.bestBookmaker === 'neds'
                                ? 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-500'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                            onClick={() => {
                              console.log('Navigate to Neds:', race.id, runner.number);
                            }}
                          >
                            ${runner.odds.neds.toFixed(2)}
                          </button>
                        </td>
                        <td className="px-4 py-4 text-center bg-emerald-50">
                          <div className="text-lg font-bold text-emerald-700">
                            ${runner.bestOdds.toFixed(2)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Footer */}
      {!loading && filteredRaces.length > 0 && (
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>Odds updated in real-time. Click any price to be directed to that bookmaker.</p>
          <p className="mt-1">Best odds highlighted in green.</p>
        </div>
      )}
    </div>
  );
}
