/**
 * MultiLegRow Component
 * Displays a single leg of a multi bet with terminal aesthetic
 */

import { MultiLeg } from '@/lib/multi/types';

interface MultiLegRowProps {
  leg: MultiLeg;
  index: number;
}

export default function MultiLegRow({ leg, index }: MultiLegRowProps) {
  // Determine probability color class
  const getProbabilityColor = (prob: number): string => {
    if (prob >= 0.7) return 'text-green-400';
    if (prob >= 0.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  const probabilityPercent = (leg.trueProbability * 100).toFixed(1);
  const colorClass = getProbabilityColor(leg.trueProbability);

  return (
    <div className="border border-green-500/20 bg-slate-900/50 rounded-lg p-4 font-mono text-sm hover:border-green-500/40 transition-colors">
      {/* Header: Sport Icon + Match */}
      <div className="flex items-start gap-2 mb-2">
        <span className="text-lg flex-shrink-0">{leg.sportIcon}</span>
        <div className="flex-1">
          <div className="text-slate-300">
            {leg.homeTeam} <span className="text-slate-600">vs</span> {leg.awayTeam}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">{leg.sportName}</div>
        </div>
        <div className="text-slate-600 text-xs">#{index + 1}</div>
      </div>

      {/* Selection */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-green-500/10">
        <div>
          <div className="text-xs text-slate-500">Selection</div>
          <div className="text-green-300 font-semibold">{leg.selection}</div>
        </div>

        {/* Probability & Odds */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-slate-500">Probability</div>
            <div className={`font-bold ${colorClass}`}>{probabilityPercent}%</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">Odds</div>
            <div className="text-green-400 font-bold">${leg.odds.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Probability Bar */}
      <div className="mt-3">
        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full ${
              leg.trueProbability >= 0.7
                ? 'bg-green-500'
                : leg.trueProbability >= 0.5
                ? 'bg-yellow-500'
                : 'bg-red-500'
            } transition-all`}
            style={{ width: `${leg.trueProbability * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
