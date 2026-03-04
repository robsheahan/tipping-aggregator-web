import Link from 'next/link';
import { Match } from '@/lib/types';
import {
  formatProbability,
  formatConfidence,
  formatTimeUntil,
  formatScore,
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

        {/* Predicted score */}
        {match.home_predicted_score != null && match.away_predicted_score != null && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Predicted Score</span>
              <span className="text-sm font-mono font-semibold text-gray-800">
                {formatScore(match.home_predicted_score)} - {formatScore(match.away_predicted_score)}
              </span>
            </div>
            {match.predicted_margin != null && (
              <div className="text-xs text-gray-500 text-right">
                Margin: {match.predicted_margin.toFixed(1)} pts
              </div>
            )}
          </div>
        )}

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
