import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { DashboardLayout } from '../layouts/DashboardLayout';
import {
  MetricsCard,
  PipelineChart,
  JobPostingsTable,
  ScreeningInsights,
  AuditLogStream,
  TimeRangeSelector,
  DPAccuracyCard,
  ComplianceFlagsCard,
  OverrideDecisionsCard,
  ComplianceAlertsPanel,
  DPComparisonModal,
  QuickActionsBar,
} from '../components';
import {
  useDashboardMetrics,
  useCandidatePipeline,
  useJobPostings,
  useScreeningResults,
  useComplianceAlerts,
  useDPMetricsDetailed,
  useOverrideMetrics,
  useDPVsNonDPComparison,
} from '../hooks/useDashboardData';
import { formatNumber } from '../utils/formatters';
import { TimeRangeFilter } from '../types/dashboard';

function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>({ preset: '30d' });
  const [dpModalOpen, setDpModalOpen] = useState(false);

  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics();
  const { data: pipeline, isLoading: pipelineLoading } = useCandidatePipeline();
  const { data: jobs, isLoading: jobsLoading } = useJobPostings();
  const { data: screeningResults, isLoading: screeningLoading } = useScreeningResults(10);

  const { data: alerts, isLoading: alertsLoading } = useComplianceAlerts(timeRange, 6);
  const { data: dpMetrics, isLoading: dpMetricsLoading } = useDPMetricsDetailed(timeRange);
  const { data: overrideMetrics, isLoading: overrideMetricsLoading } = useOverrideMetrics(timeRange);
  const { data: dpComparison, isLoading: dpComparisonLoading } = useDPVsNonDPComparison(timeRange, 25);

  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  if (!user) return null;

  const timeRangeLabel = timeRange.preset === 'custom'
    ? 'Custom'
    : timeRange.preset.toUpperCase();

  const handleExportAuditReport = () => {
    const report = `Audit Report - ${new Date().toLocaleString()}\n\nAlerts: ${alerts?.length || 0}\nOverrides: ${overrideMetrics?.totalOverrides || 0}`;
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-report-${Date.now()}.txt`;
    a.click();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-32">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
          <TimeRangeSelector selectedRange={timeRange} onChange={setTimeRange} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricsCard
            title="Total Candidates"
            value={metricsLoading ? '...' : formatNumber(metrics?.totalCandidates || 0)}
            change={5.2}
            trend="up"
            subtitle="vs last month"
            timeRange={timeRangeLabel}
          />
          <MetricsCard
            title="Active Applications"
            value={metricsLoading ? '...' : formatNumber(metrics?.totalApplications || 0)}
            change={12.8}
            trend="up"
            subtitle="in review pipeline"
            timeRange={timeRangeLabel}
          />
          <MetricsCard
            title="Open Positions"
            value={metricsLoading ? '...' : formatNumber(metrics?.activeJobs || 0)}
            change={-3.1}
            trend="down"
            subtitle="currently hiring"
            timeRange={timeRangeLabel}
          />
          <MetricsCard
            title="Avg Screening Score"
            value={metricsLoading ? '...' : `${metrics?.avgScreeningScore || 0}%`}
            change={7.5}
            trend="up"
            subtitle="quality of matches"
            timeRange={timeRangeLabel}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DPAccuracyCard
            accuracy={82}
            delta={2.3}
            trend="up"
            sparklineData={[78, 79, 80, 81, 82]}
            epsilonBudget={1.5}
            timeRange={timeRangeLabel}
          />
          <ComplianceFlagsCard
            flagCount={alerts?.length || 0}
            trend="down"
            change={-15}
            riskDistribution={{
              high: alerts?.filter((a) => a.severity === 'high').length || 0,
              medium: alerts?.filter((a) => a.severity === 'medium').length || 0,
              low: alerts?.filter((a) => a.severity === 'low').length || 0,
            }}
            sparklineData={[12, 14, 11, 13, 9]}
            timeRange={timeRangeLabel}
          />
          <OverrideDecisionsCard
            totalOverrides={overrideMetrics?.totalOverrides || 0}
            escalatedCount={overrideMetrics?.escalatedCount || 0}
            trend="neutral"
            sparklineData={[3, 4, 3, 5, 4]}
            timeRange={timeRangeLabel}
          />
          <MetricsCard
            title="Screening Completion"
            value={`${Math.round((screeningResults?.length || 0 / 10) * 100)}%`}
            change={8}
            trend="up"
            subtitle="of daily targets"
            timeRange={timeRangeLabel}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 gap-6">
              {!pipelineLoading && pipeline && <PipelineChart data={pipeline} />}
              {!jobsLoading && jobs && <JobPostingsTable jobs={jobs} />}
            </div>
          </div>
          <div className="space-y-6">
            <ComplianceAlertsPanel alerts={alerts || []} isLoading={alertsLoading} />
            <AuditLogStream />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {!screeningLoading && screeningResults && (
            <ScreeningInsights results={screeningResults.slice(0, 5)} />
          )}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Privacy Mechanism Metrics</h3>
            {dpMetricsLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : dpMetrics && dpMetrics.length > 0 ? (
              <div className="space-y-3">
                {dpMetrics.map((metric) => (
                  <div key={metric.mechanism} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 capitalize">{metric.mechanism}</p>
                      <p className="text-xs text-gray-600">ε={metric.epsilonBudget.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{metric.sampleCount} samples</p>
                      <p className="text-xs text-gray-600">CI: ±{metric.confidenceIntervalWidth.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No mechanism data available</p>
            )}
          </div>
        </div>

        <QuickActionsBar
          onViewFlaggedResumes={() => navigate('/applications?filter=flagged')}
          onExportAuditReport={handleExportAuditReport}
          onCompareDPModels={() => setDpModalOpen(true)}
          onReviewOverrides={() => navigate('/applications?filter=overrides')}
        />

        <DPComparisonModal
          isOpen={dpModalOpen}
          onClose={() => setDpModalOpen(false)}
          comparisonData={dpComparison || []}
          mechanismMetrics={dpMetrics || []}
          isLoading={dpComparisonLoading}
        />
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;
