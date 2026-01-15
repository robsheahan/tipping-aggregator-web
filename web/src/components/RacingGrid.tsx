'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Runner {
  number: number;
  name: string;
  consensus_score: number;
  best_odds: number;
  best_bookmaker: string;
  ai_verdict: string;
  num_tips: number;
  tip_breakdown: { [source: string]: number };
}

interface Race {
  race_id: string;
  venue: string;
  race_number: number;
  start_time: string;
  runners_with_consensus: Runner[];
}

interface RacingGridProps {
  races: Race[];
}

export default function RacingGrid({ races }: RacingGridProps) {
  const [selectedRace, setSelectedRace] = useState<string | null>(null);
  const [showVerdictFor, setShowVerdictFor] = useState<string | null>(null);

  if (races.length === 0) {
    return (
      <div className="bg-white rounded-xl border-2 border-slate-200 p-12 text-center">
        <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No Races Available</h3>
        <p className="text-slate-600">Check back later for today&apos;s racing tips and consensus scores.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {races.map((race) => (
        <div
          key={race.race_id}
          className="bg-white rounded-xl border-2 border-slate-200 border-t-4 border-t-amber-500 overflow-hidden hover:shadow-lg transition-shadow"
        >
          {/* Race Header */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-slate-200">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {race.venue} - Race {race.race_number}
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  {race.runners_with_consensus.length} runners with AI consensus
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-600">Jump Time</div>
                <div className="text-lg font-bold text-slate-900">
                  {new Date(race.start_time).toLocaleTimeString('en-AU', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Runners Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">#</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">Runner</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-slate-700">
                    Consensus
                    <div className="text-xs font-normal text-slate-500">AI Score</div>
                  </th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-slate-700">
                    Tips
                    <div className="text-xs font-normal text-slate-500">Count</div>
                  </th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-slate-700 bg-emerald-50">
                    Best Odds
                    <div className="text-xs font-normal text-slate-500">Bookmaker</div>
                  </th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-slate-700">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {race.runners_with_consensus
                  .sort((a, b) => b.consensus_score - a.consensus_score)
                  .map((runner) => (
                    <tr
                      key={runner.number}
                      className="hover:bg-slate-50 transition-colors"
                      onMouseEnter={() => setShowVerdictFor(`${race.race_id}-${runner.number}`)}
                      onMouseLeave={() => setShowVerdictFor(null)}
                    >
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">{runner.number}</td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{runner.name}</div>
                        {/* AI Verdict Tooltip */}
                        {showVerdictFor === `${race.race_id}-${runner.number}` && runner.ai_verdict && (
                          <div className="text-sm text-indigo-600 mt-1 italic">
                            &quot;{runner.ai_verdict}&quot;
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {/* Consensus Meter */}
                        <ConsensuseMeter score={runner.consensus_score} />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="text-sm font-semibold text-slate-700">{runner.num_tips}</div>
                        {/* Tip sources on hover */}
                        {showVerdictFor === `${race.race_id}-${runner.number}` && runner.tip_breakdown && (
                          <div className="text-xs text-slate-500 mt-1">
                            {Object.keys(runner.tip_breakdown).join(', ')}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center bg-emerald-50">
                        <div className="text-lg font-bold text-emerald-700">
                          ${runner.best_odds?.toFixed(2) || 'N/A'}
                        </div>
                        <div className="text-xs text-slate-600 capitalize">{runner.best_bookmaker}</div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <a
                          href={`${process.env.NEXT_PUBLIC_APP_URL || ''}/go/${runner.best_bookmaker}?race_id=${race.race_id}&runner=${runner.number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-sm font-semibold rounded-lg transition-all shadow-sm hover:shadow-md"
                        >
                          Bet Now
                        </a>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Consensus Meter Component
 * Visual confidence bar (0-100%)
 */
function ConsensuseMeter({ score }: { score: number }) {
  // Determine color based on score
  let colorClass = 'bg-slate-400';
  let textColor = 'text-slate-700';

  if (score >= 80) {
    colorClass = 'bg-emerald-500';
    textColor = 'text-emerald-700';
  } else if (score >= 60) {
    colorClass = 'bg-green-500';
    textColor = 'text-green-700';
  } else if (score >= 40) {
    colorClass = 'bg-yellow-500';
    textColor = 'text-yellow-700';
  } else if (score >= 20) {
    colorClass = 'bg-orange-500';
    textColor = 'text-orange-700';
  } else {
    colorClass = 'bg-red-500';
    textColor = 'text-red-700';
  }

  return (
    <div className="flex items-center justify-center gap-2">
      <div className="w-24 h-3 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClass} transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className={`text-sm font-bold ${textColor}`}>{score}</div>
    </div>
  );
}
