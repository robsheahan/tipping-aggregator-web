import Link from 'next/link';
import { Match } from '@/lib/types';
import {
  formatProbability,
  formatConfidence,
  formatTimeUntil,
  getTipColor,
  getConfidenceColor,
} from '@/utils/formatting';

interface MatchCardProps {
  match: Match;
}

export default function MatchCard({ match }: MatchCardProps) {
  const tipDisplay =
    match.tip === 'home'
      ? match.home_team.name
      : match.tip === 'away'
      ? match.away_team.name
      : 'Draw';

  return (
    <Link href={`/matches/${match.id}?league=${match.league.code}`}>
      <div className="card hover:shadow-md transition-shadow cursor-pointer">
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-500">{match.league.code}</span>
            <span className="text-sm font-medium text-gray-700">
              {formatTimeUntil(match.kickoff_time)}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {/* Home team */}
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <span className="font-semibold text-gray-900">
                {match.home_team.name}
              </span>
            </div>
            <div className="text-right">
              <span className="text-sm font-mono text-gray-700">
                {formatProbability(match.home_prob)}
              </span>
            </div>
          </div>

          {/* Draw (if applicable) */}
          {match.draw_prob !== null && match.draw_prob !== undefined && (
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <span className="font-semibold text-gray-600">Draw</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-mono text-gray-700">
                  {formatProbability(match.draw_prob)}
                </span>
              </div>
            </div>
          )}

          {/* Away team */}
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <span className="font-semibold text-gray-900">
                {match.away_team.name}
              </span>
            </div>
            <div className="text-right">
              <span className="text-sm font-mono text-gray-700">
                {formatProbability(match.away_prob)}
              </span>
            </div>
          </div>
        </div>

        {/* Tip and confidence */}
        {match.tip && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm text-gray-500">Tip: </span>
                <span className={`font-semibold ${getTipColor(match.tip)}`}>
                  {tipDisplay}
                </span>
              </div>
              <div>
                <span
                  className={`text-sm font-medium ${getConfidenceColor(
                    match.confidence
                  )}`}
                >
                  {formatConfidence(match.confidence)}
                </span>
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {match.contributing_providers} provider
              {match.contributing_providers !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
