'use client';

import Link from 'next/link';

interface SportCardProps {
  code: string;
  name: string;
  displayName: string;
  icon: string;
  color: string;
  matchCount: number;
}

export default function SportCard({
  code,
  name,
  displayName,
  icon,
  color,
  matchCount,
}: SportCardProps) {
  // Color mapping for Tailwind classes
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 hover:border-blue-400 text-blue-900',
    green: 'bg-green-50 border-green-200 hover:border-green-400 text-green-900',
    red: 'bg-red-50 border-red-200 hover:border-red-400 text-red-900',
    orange: 'bg-orange-50 border-orange-200 hover:border-orange-400 text-orange-900',
    purple: 'bg-purple-50 border-purple-200 hover:border-purple-400 text-purple-900',
    teal: 'bg-teal-50 border-teal-200 hover:border-teal-400 text-teal-900',
  };

  const buttonColors: Record<string, string> = {
    blue: 'bg-blue-600 hover:bg-blue-700',
    green: 'bg-green-600 hover:bg-green-700',
    red: 'bg-red-600 hover:bg-red-700',
    orange: 'bg-orange-600 hover:bg-orange-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
    teal: 'bg-teal-600 hover:bg-teal-700',
  };

  return (
    <Link href={`/sport/${code.toLowerCase()}`}>
      <div
        className={`
          rounded-xl border-2 p-8 transition-all duration-200
          hover:shadow-lg cursor-pointer
          ${colorClasses[color] || colorClasses.blue}
        `}
      >
        {/* Sport Name */}
        <h2 className="text-3xl font-bold text-center mb-2">{displayName}</h2>
        <p className="text-sm text-center text-gray-600 mb-6">{name}</p>

        {/* Match Count */}
        <div className="text-center mb-6">
          <div className="text-3xl font-bold">{matchCount}</div>
          <div className="text-sm text-gray-600">
            {matchCount === 1 ? 'Upcoming Match' : 'Upcoming Matches'}
          </div>
        </div>

        {/* View Button */}
        <button
          className={`
            w-full py-3 px-4 rounded-lg font-semibold text-white
            transition-colors duration-200
            ${buttonColors[color] || buttonColors.blue}
          `}
        >
          View Matches
        </button>
      </div>
    </Link>
  );
}
