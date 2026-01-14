import { Snapshot } from '@/lib/types';
import { formatDateTime, formatProbability } from '@/utils/formatting';

interface ProviderTableProps {
  snapshots: Snapshot[];
}

export default function ProviderTable({ snapshots }: ProviderTableProps) {
  // Get latest snapshot per provider
  const latestSnapshots = snapshots
    .reduce((acc, snapshot) => {
      const existing = acc.get(snapshot.provider_id);
      if (!existing || snapshot.captured_at > existing.captured_at) {
        acc.set(snapshot.provider_id, snapshot);
      }
      return acc;
    }, new Map<number, Snapshot>())
    .values();

  const snapshotArray = Array.from(latestSnapshots).sort(
    (a, b) => new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime()
  );

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Provider
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Home
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Draw
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Away
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Captured
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {snapshotArray.map((snapshot) => (
            <tr key={snapshot.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                Provider {snapshot.provider_id}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                {formatProbability(snapshot.home_prob)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                {snapshot.draw_prob !== null && snapshot.draw_prob !== undefined
                  ? formatProbability(snapshot.draw_prob)
                  : 'N/A'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                {formatProbability(snapshot.away_prob)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDateTime(snapshot.captured_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
