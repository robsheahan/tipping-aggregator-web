'use client';

import { RoundDefinition } from '@/lib/rounds/roundMappings';

interface RoundFilterProps {
  rounds: RoundDefinition[];
  selectedRound: number | null;
  onRoundChange: (roundNumber: number | null) => void;
  sportColor: string;
}

export default function RoundFilter({
  rounds,
  selectedRound,
  onRoundChange,
  sportColor,
}: RoundFilterProps) {
  const selectColors: Record<string, string> = {
    blue: 'border-blue-300 focus:border-blue-500 focus:ring-blue-500',
    green: 'border-green-300 focus:border-green-500 focus:ring-green-500',
    red: 'border-red-300 focus:border-red-500 focus:ring-red-500',
    orange: 'border-orange-300 focus:border-orange-500 focus:ring-orange-500',
    purple: 'border-purple-300 focus:border-purple-500 focus:ring-purple-500',
    teal: 'border-teal-300 focus:border-teal-500 focus:ring-teal-500',
  };

  return (
    <div className="mb-6">
      <label
        htmlFor="round-select"
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        Filter by Round/Week
      </label>
      <select
        id="round-select"
        value={selectedRound === null ? 'all' : selectedRound}
        onChange={(e) => {
          const value = e.target.value;
          onRoundChange(value === 'all' ? null : parseInt(value));
        }}
        className={`
          block w-full md:w-64 px-4 py-2 pr-8
          bg-white border-2 rounded-lg
          text-gray-900 font-medium
          transition-colors duration-200
          focus:outline-none focus:ring-2
          ${selectColors[sportColor] || selectColors.blue}
        `}
      >
        <option value="all">All Rounds</option>
        {rounds.map((round) => (
          <option key={round.roundNumber} value={round.roundNumber}>
            {round.label}
          </option>
        ))}
      </select>
    </div>
  );
}
