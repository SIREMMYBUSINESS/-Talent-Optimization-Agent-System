import { MetricsCard } from './MetricsCard';

interface ComplianceFlagsCardProps {
  flagCount: number;
  trend: 'up' | 'down' | 'neutral';
  change?: number;
  riskDistribution?: { high: number; medium: number; low: number };
  sparklineData?: number[];
  timeRange?: string;
}

export function ComplianceFlagsCard({
  flagCount,
  trend,
  change,
  riskDistribution,
  sparklineData = [],
  timeRange,
}: ComplianceFlagsCardProps) {
  const riskBadge = riskDistribution
    ? `${riskDistribution.high}H ${riskDistribution.medium}M`
    : undefined;

  return (
    <MetricsCard
      title="Compliance Flags"
      value={flagCount}
      change={change}
      trend={trend}
      sparklineData={sparklineData}
      sparklineColor="rgb(239, 68, 68)"
      subtitle={riskBadge}
      timeRange={timeRange}
    />
  );
}
