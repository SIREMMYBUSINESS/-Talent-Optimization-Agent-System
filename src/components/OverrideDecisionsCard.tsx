import { MetricsCard } from './MetricsCard';

interface OverrideDecisionsCardProps {
  totalOverrides: number;
  escalatedCount: number;
  trend: 'up' | 'down' | 'neutral';
  change?: number;
  sparklineData?: number[];
  timeRange?: string;
}

export function OverrideDecisionsCard({
  totalOverrides,
  escalatedCount,
  trend,
  change,
  sparklineData = [],
  timeRange,
}: OverrideDecisionsCardProps) {
  const escalationBadge = escalatedCount > 0 ? `${escalatedCount} escalated` : 'All reviewed';

  return (
    <MetricsCard
      title="Override Decisions"
      value={totalOverrides}
      change={change}
      trend={trend}
      sparklineData={sparklineData}
      sparklineColor="rgb(245, 158, 11)"
      subtitle={escalationBadge}
      timeRange={timeRange}
    />
  );
}
