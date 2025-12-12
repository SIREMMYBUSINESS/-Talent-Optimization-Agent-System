import { ReactNode } from 'react';
import { getTrendColor } from '../utils/formatters';

interface MetricsCardProps {
  title: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  icon?: ReactNode;
  subtitle?: string;
  sparklineData?: number[];
  sparklineColor?: string;
  timeRange?: string;
}

export function MetricsCard({
  title,
  value,
  change,
  trend,
  icon,
  subtitle,
  sparklineData,
  sparklineColor = 'rgb(34, 197, 94)',
  timeRange,
}: MetricsCardProps) {
  const maxValue = sparklineData ? Math.max(...sparklineData, 1) : 1;
  const minValue = sparklineData ? Math.min(...sparklineData, 0) : 0;
  const range = maxValue - minValue || 1;

  const sparklinePoints = sparklineData
    ?.map((val, idx) => {
      const x = (idx / Math.max(sparklineData.length - 1, 1)) * 100;
      const y = 100 - ((val - minValue) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow relative">
      {timeRange && (
        <div className="absolute top-2 right-2 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {timeRange}
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>

      <div className="flex items-baseline space-x-2">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {change !== undefined && trend && (
          <span className={`text-sm font-medium ${getTrendColor(trend)}`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {Math.abs(change)}%
          </span>
        )}
      </div>

      {subtitle && <p className="mt-2 text-xs text-gray-500">{subtitle}</p>}

      {sparklineData && sparklineData.length > 0 && (
        <div className="mt-4 h-12 flex items-end justify-center">
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full">
            <polyline
              points={sparklinePoints}
              fill="none"
              stroke={sparklineColor}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
