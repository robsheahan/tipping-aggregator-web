import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Snapshot } from '@/lib/types';
import { format, parseISO } from 'date-fns';

interface ProbabilityChartProps {
  snapshots: Snapshot[];
}

export default function ProbabilityChart({ snapshots }: ProbabilityChartProps) {
  // Group snapshots by captured_at and calculate average probabilities
  const timeSeriesData = snapshots
    .reduce((acc, snapshot) => {
      const time = snapshot.captured_at;
      const existing = acc.find((item) => item.time === time);

      if (existing) {
        existing.count += 1;
        existing.home += snapshot.home_prob;
        existing.away += snapshot.away_prob;
        if (snapshot.draw_prob !== null && snapshot.draw_prob !== undefined) {
          existing.draw = (existing.draw || 0) + snapshot.draw_prob;
        }
      } else {
        acc.push({
          time,
          home: snapshot.home_prob,
          away: snapshot.away_prob,
          draw: snapshot.draw_prob || 0,
          count: 1,
        });
      }

      return acc;
    }, [] as Array<{ time: string; home: number; away: number; draw: number; count: number }>)
    .map((item) => ({
      time: item.time,
      home: (item.home / item.count) * 100,
      away: (item.away / item.count) * 100,
      draw: item.draw ? (item.draw / item.count) * 100 : undefined,
    }))
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(-50); // Last 50 data points

  const hasDrawProbs = timeSeriesData.some((d) => d.draw !== undefined && d.draw > 0);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={timeSeriesData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="time"
          tickFormatter={(value) => {
            try {
              return format(parseISO(value), 'MMM d HH:mm');
            } catch {
              return value;
            }
          }}
        />
        <YAxis
          label={{ value: 'Probability (%)', angle: -90, position: 'insideLeft' }}
          domain={[0, 100]}
        />
        <Tooltip
          labelFormatter={(value) => {
            try {
              return format(parseISO(value as string), 'MMM d, yyyy HH:mm');
            } catch {
              return value;
            }
          }}
          formatter={(value: number) => `${value.toFixed(1)}%`}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="home"
          stroke="#2563eb"
          name="Home Win"
          strokeWidth={2}
          dot={false}
        />
        {hasDrawProbs && (
          <Line
            type="monotone"
            dataKey="draw"
            stroke="#ca8a04"
            name="Draw"
            strokeWidth={2}
            dot={false}
          />
        )}
        <Line
          type="monotone"
          dataKey="away"
          stroke="#dc2626"
          name="Away Win"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
