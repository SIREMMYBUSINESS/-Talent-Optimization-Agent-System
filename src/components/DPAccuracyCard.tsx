import { MetricsCard } from './MetricsCard';

interface DPAccuracyCardProps {
  accuracy: number;
  delta: number;
  trend: 'up' | 'down' | 'neutral';
  sparklineData?: number[];
  epsilonBudget?: number;
  timeRange?: string;
}

export function DPAccuracyCard({
  accuracy,
  delta,
  trend,
  sparklineData = [],
  epsilonBudget,
  timeRange,
}: DPAccuracyCardProps) {
  return (
    <MetricsCard
      title="DP Screening Accuracy"
      value={`${accuracy}%`}
      change={delta}
      trend={trend}
      sparklineData={sparklineData}
      sparklineColor="rgb(34, 197, 94)"
      subtitle={epsilonBudget !== undefined ? `Epsilon budget: ${epsilonBudget}` : undefined}
      timeRange={timeRange}
    />
  );
}
