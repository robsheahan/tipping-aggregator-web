/**
 * MultiLegRow Component
 * Displays a single leg of a multi bet with modern clean design
 */

import { MultiLeg } from '@/lib/multi/types';

interface MultiLegRowProps {
  leg: MultiLeg;
  index: number;
}

export default function MultiLegRow({ leg, index }: MultiLegRowProps) {
  // Determine probability color class
  const getProbabilityColor = (prob: number): string => {
    if (prob >= 0.7) return 'text-emerald-600';
    if (prob >= 0.5) return 'text-amber-600';
    return 'text-rose-600';
  };

  const getProbabilityBgColor = (prob: number): string => {
    if (prob >= 0.7) return 'bg-emerald-500';
    if (prob >= 0.5) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const probabilityPercent = (leg.trueProbability * 100).toFixed(1);
  const colorClass = getProbabilityColor(leg.trueProbability);
  const bgColorClass = getProbabilityBgColor(leg.trueProbability);

  return (
    <div className="border border-slate-200 bg-white rounded-lg p-4 hover:border-indigo-300 hover:shadow-md transition-all">
      {/* Header: Sport Icon + Match */}
      <div className="flex items-start gap-2 mb-2">
        <span className="text-lg flex-shrink-0">{leg.sportIcon}</span>
        <div className="flex-1">
          <div className="text-slate-900 font-medium">
            {leg.homeTeam} <span className="text-slate-400">vs</span> {leg.awayTeam}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">{leg.sportName}</div>
        </div>
        <div className="text-slate-400 text-xs font-semibold bg-slate-100 px-2 py-1 rounded">
          #{index + 1}
        </div>
      </div>

      {/* Selection */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
        <div>
          <div className="text-xs text-slate-500 mb-0.5">Selection</div>
          <div className="text-indigo-900 font-semibold">{leg.selection}</div>
        </div>

        {/* Probability & Odds */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-slate-500 mb-0.5">Probability</div>
            <div className={`font-bold ${colorClass}`}>{probabilityPercent}%</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500 mb-0.5">Odds</div>
            <div className="text-indigo-900 font-bold">${leg.odds.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Probability Bar */}
      <div className="mt-3">
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${bgColorClass} transition-all`}
            style={{ width: `${leg.trueProbability * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
