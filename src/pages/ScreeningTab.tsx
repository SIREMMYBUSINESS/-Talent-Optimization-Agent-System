import { useState } from 'react';
import { TimeRangeFilter } from '../types/dashboard';
import { TimeRangeSelector } from '../components';
import {
  ScreeningComparisonChart,
  BiasHeatmap,
  LatencyTracker,
  ConfidenceDistribution,
  OverrideTrackerList,
} from '../components';
import { useScreeningMetrics } from '../hooks/useDashboardData';

export function ScreeningTab() {
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>({ preset: '30d' });
  const { data: metrics, isLoading } = useScreeningMetrics(timeRange);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Screening Performance</h2>
        <TimeRangeSelector selectedRange={timeRange} onChange={setTimeRange} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ScreeningComparisonChart
          dpAccuracy={metrics?.dpAccuracy || 78}
          nonDpAccuracy={metrics?.nonDpAccuracy || 82}
          isLoading={isLoading}
        />
        <BiasHeatmap isLoading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LatencyTracker
          avgLatency={metrics?.avgLatencySeconds || 2.5}
          isLoading={isLoading}
        />
        <ConfidenceDistribution
          high={metrics?.confidenceDistribution.high || 0}
          medium={metrics?.confidenceDistribution.medium || 0}
          low={metrics?.confidenceDistribution.low || 0}
          isLoading={isLoading}
        />
      </div>

      <OverrideTrackerList isLoading={isLoading} />
    </div>
  );
}
