import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer } from './ChartContainer';

interface ConfidenceDistributionProps {
  high: number;
  medium: number;
  low: number;
  isLoading?: boolean;
}

export function ConfidenceDistribution({
  high,
  medium,
  low,
  isLoading = false,
}: ConfidenceDistributionProps) {
  const total = high + medium + low;
  const data = [
    {
      range: '80-100%',
      count: high,
      percentage: total > 0 ? ((high / total) * 100).toFixed(1) : '0',
      fill: '#10b981',
    },
    {
      range: '60-79%',
      count: medium,
      percentage: total > 0 ? ((medium / total) * 100).toFixed(1) : '0',
      fill: '#f59e0b',
    },
    {
      range: '<60%',
      count: low,
      percentage: total > 0 ? ((low / total) * 100).toFixed(1) : '0',
      fill: '#ef4444',
    },
  ];

  return (
    <ChartContainer
      title="Model Confidence Distribution"
      isLoading={isLoading}
      footer={
        <div className="space-y-2 text-xs">
          {data.map((item) => (
            <div key={item.range} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: item.fill }} />
              <span className="text-gray-700">
                {item.range}: {item.count} ({item.percentage}%)
              </span>
            </div>
          ))}
        </div>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
          layout="vertical"
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis type="category" dataKey="range" />
          <Tooltip formatter={(value) => value} />
          <Bar dataKey="count" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
