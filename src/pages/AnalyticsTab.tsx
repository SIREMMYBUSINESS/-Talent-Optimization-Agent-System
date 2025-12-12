import { useState } from 'react';
import { TimeRangeFilter } from '../types/dashboard';
import { TimeRangeSelector } from '../components';
import {
  ConversionFunnel,
  DropOffReasons,
  SkillGapAnalysis,
  RoleFitClustering,
} from '../components';
import { useAnalyticsData } from '../hooks/useDashboardData';

export function AnalyticsTab() {
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>({ preset: '30d' });
  const { data: analyticsData, isLoading } = useAnalyticsData(timeRange);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Analytics & Conversion Insights</h2>
        <TimeRangeSelector selectedRange={timeRange} onChange={setTimeRange} />
      </div>

      <ConversionFunnel data={analyticsData?.funnel} isLoading={isLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DropOffReasons data={analyticsData?.dropoff} isLoading={isLoading} />
        <SkillGapAnalysis isLoading={isLoading} />
      </div>

      <RoleFitClustering isLoading={isLoading} />
    </div>
  );
}
