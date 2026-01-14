'use client';

import Link from 'next/link';

interface SportCardProps {
  code: string;
  name: string;
  displayName: string;
  icon: string;
  color: string;
  matchCount: number;
  loading?: boolean;
}

export default function SportCard({
  code,
  name,
  displayName,
  icon,
  color,
  matchCount,
  loading = false,
}: SportCardProps) {
  // Accent color for top border and badge
  const accentColors: Record<string, string> = {
    blue: 'border-blue-500',
    green: 'border-emerald-500',
    red: 'border-red-500',
    orange: 'border-orange-500',
    purple: 'border-purple-500',
    teal: 'border-teal-500',
  };

  const badgeColors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 ring-slate-200',
    green: 'bg-emerald-50 text-emerald-700 ring-slate-200',
    red: 'bg-red-50 text-red-700 ring-slate-200',
    orange: 'bg-orange-50 text-orange-700 ring-slate-200',
    purple: 'bg-purple-50 text-purple-700 ring-slate-200',
    teal: 'bg-teal-50 text-teal-700 ring-slate-200',
  };

  const iconColors: Record<string, string> = {
    blue: 'text-blue-500',
    green: 'text-emerald-500',
    red: 'text-red-500',
    orange: 'text-orange-500',
    purple: 'text-purple-500',
    teal: 'text-teal-500',
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 border-t-4 border-t-slate-300 p-6 animate-pulse">
        <div className="mb-4">
          <div className="h-6 bg-slate-200 rounded w-20 mb-2" />
          <div className="h-4 bg-slate-100 rounded w-32" />
        </div>
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 bg-slate-200 rounded w-16" />
          <div className="h-6 bg-slate-100 rounded w-32" />
        </div>
        <div className="h-10 bg-slate-200 rounded-lg" />
      </div>
    );
  }

  return (
    <Link href={`/sport/${code.toLowerCase()}`} className="group block">
      <div
        className={`
          bg-white rounded-xl border-2 border-slate-200 border-t-4
          ${accentColors[color] || accentColors.blue}
          p-6 transition-all duration-200
          hover:shadow-lg hover:-translate-y-1 hover:border-slate-300
        `}
      >
        {/* Header with title */}
        <div className="mb-5">
          <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
            {displayName}
          </h3>
          <p className="text-sm text-slate-500 line-clamp-1">{name}</p>
        </div>

        {/* Match count with badge */}
        <div className="flex items-center justify-between mb-6 pb-5 border-b border-slate-100">
          <div>
            <div className="text-3xl font-bold text-slate-900 tabular-nums">
              {matchCount}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              {matchCount === 1 ? 'Upcoming Match' : 'Upcoming Matches'}
            </div>
          </div>
          <div
            className={`
              px-3 py-1.5 rounded-full text-xs font-semibold ring-1 ring-inset
              ${badgeColors[color] || badgeColors.blue}
            `}
          >
            Live Odds
          </div>
        </div>

        {/* View button */}
        <button
          className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          aria-label={`View ${displayName} matches`}
        >
          View Matches
          <svg className="inline-block ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </Link>
  );
}
