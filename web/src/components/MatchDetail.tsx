import { Match } from '@/lib/types';
import { formatProbability, formatDateTime, getTipColor } from '@/utils/formatting';

interface MatchDetailProps {
  match: Match;
}

export default function MatchDetail({ match }: MatchDetailProps) {
  return (
    <div className="card">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">
          {match.home_team.name} vs {match.away_team.name}
        </h2>
        <p className="text-sm text-gray-600">
          {formatDateTime(match.kickoff_time)} • {match.league.code}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-sm text-gray-500 mb-1">Home Win</div>
          <div className="text-2xl font-bold text-blue-600">
            {formatProbability(match.home_prob)}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-500 mb-1">Away Win</div>
          <div className="text-2xl font-bold text-red-600">
            {formatProbability(match.away_prob)}
          </div>
        </div>
      </div>

      {match.tip && (
        <div className="pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Predicted Winner:</span>
            <span className={`font-bold ${getTipColor(match.tip)}`}>
              {match.tip === 'home' ? match.home_team.name : match.away_team.name}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
