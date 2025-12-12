import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer } from './ChartContainer';

interface ScreeningComparisonChartProps {
  dpAccuracy: number;
  nonDpAccuracy: number;
  dpPrecision?: number;
  nonDpPrecision?: number;
  dpRecall?: number;
  nonDpRecall?: number;
  isLoading?: boolean;
}

export function ScreeningComparisonChart({
  dpAccuracy,
  nonDpAccuracy,
  dpPrecision = dpAccuracy,
  nonDpPrecision = nonDpAccuracy,
  dpRecall = dpAccuracy,
  nonDpRecall = nonDpAccuracy,
  isLoading = false,
}: ScreeningComparisonChartProps) {
  const data = [
    {
      metric: 'Accuracy',
      'DP Model': dpAccuracy,
      'Non-DP Model': nonDpAccuracy,
    },
    {
      metric: 'Precision',
      'DP Model': dpPrecision,
      'Non-DP Model': nonDpPrecision,
    },
    {
      metric: 'Recall',
      'DP Model': dpRecall,
      'Non-DP Model': nonDpRecall,
    },
  ];

  return (
    <ChartContainer title="DP vs Non-DP Model Performance" isLoading={isLoading}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="metric" />
          <YAxis domain={[0, 100]} label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }} />
          <Tooltip formatter={(value) => `${value}%`} />
          <Legend />
          <Bar dataKey="DP Model" fill="#3b82f6" />
          <Bar dataKey="Non-DP Model" fill="#10b981" />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
