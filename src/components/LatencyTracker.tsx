import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer } from './ChartContainer';

interface LatencyData {
  time: string;
  latency: number;
}

interface LatencyTrackerProps {
  data?: LatencyData[];
  avgLatency?: number;
  isLoading?: boolean;
}

export function LatencyTracker({ data, avgLatency = 2.5, isLoading = false }: LatencyTrackerProps) {
  const defaultData: LatencyData[] = [
    { time: '12:00 AM', latency: 2.1 },
    { time: '4:00 AM', latency: 1.9 },
    { time: '8:00 AM', latency: 3.2 },
    { time: '12:00 PM', latency: 2.8 },
    { time: '4:00 PM', latency: 3.5 },
    { time: '8:00 PM', latency: 2.3 },
    { time: '11:00 PM', latency: 2.0 },
  ];

  const displayData = data || defaultData;

  return (
    <ChartContainer
      title="Average Screening Time per Resume"
      isLoading={isLoading}
      footer={
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-600">Average</p>
            <p className="text-lg font-semibold text-gray-900">{avgLatency.toFixed(1)}s</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Min</p>
            <p className="text-lg font-semibold text-green-600">
              {Math.min(...displayData.map((d) => d.latency)).toFixed(1)}s
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Max</p>
            <p className="text-lg font-semibold text-red-600">
              {Math.max(...displayData.map((d) => d.latency)).toFixed(1)}s
            </p>
          </div>
        </div>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={displayData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis label={{ value: 'Seconds', angle: -90, position: 'insideLeft' }} />
          <Tooltip formatter={(value) => `${value.toFixed(1)}s`} />
          <Line
            type="monotone"
            dataKey="latency"
            stroke="#3b82f6"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
