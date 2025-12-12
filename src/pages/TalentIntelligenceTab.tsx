import { useState } from 'react';
import { TimeRangeFilter } from '../types/dashboard';
import { TimeRangeSelector } from '../components';
import {
  SentimentAnalysis,
  SkillHeatmap,
  PredictiveHiringScore,
  FederatedModelPerformance,
} from '../components';
import { useTalentInsights } from '../hooks/useDashboardData';

export function TalentIntelligenceTab() {
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>({ preset: '30d' });
  const [selectedDepartment, setSelectedDepartment] = useState('Engineering');
  const { data: insights, isLoading } = useTalentInsights(timeRange);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Talent Intelligence & Predictive Insights</h2>
        <div className="flex gap-4">
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option>Engineering</option>
            <option>Product</option>
            <option>Sales</option>
            <option>HR</option>
          </select>
          <TimeRangeSelector selectedRange={timeRange} onChange={setTimeRange} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SentimentAnalysis isLoading={isLoading} />
        <SkillHeatmap department={selectedDepartment} isLoading={isLoading} />
      </div>

      <PredictiveHiringScore
        overallScore={insights?.avgHiringScore || 82}
        isLoading={isLoading}
      />

      <FederatedModelPerformance isLoading={isLoading} />
    </div>
  );
}
