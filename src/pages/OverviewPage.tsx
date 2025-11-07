import { ErrorBoundary } from '../components/ErrorBoundary';
import { MetricsCard } from '../components/MetricsCard';
import { PipelineChart } from '../components/PipelineChart';
import { JobPostingsTable } from '../components/JobPostingsTable';
import { ScreeningInsights } from '../components/ScreeningInsights';
import { AuditLogStream } from '../components/AuditLogStream';
import {
  useDashboardMetrics,
  useCandidatePipeline,
  useJobPostings,
  useScreeningResults,
} from '../hooks/useDashboardData';
import { formatNumber } from '../utils/formatters';

function OverviewPage() {
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics();
  const { data: pipeline, isLoading: pipelineLoading } = useCandidatePipeline();
  const { data: jobs, isLoading: jobsLoading } = useJobPostings();
  const { data: screeningResults, isLoading: screeningLoading } = useScreeningResults(10);

  return (
    <ErrorBoundary>
      <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricsCard
          title="Total Candidates"
          value={metricsLoading ? '...' : formatNumber(metrics?.totalCandidates || 0)}
          change={5.2}
          trend="up"
          subtitle="vs last month"
        />
        <MetricsCard
          title="Active Applications"
          value={metricsLoading ? '...' : formatNumber(metrics?.totalApplications || 0)}
          change={12.8}
          trend="up"
          subtitle="in review pipeline"
        />
        <MetricsCard
          title="Open Positions"
          value={metricsLoading ? '...' : formatNumber(metrics?.activeJobs || 0)}
          change={-3.1}
          trend="down"
          subtitle="currently hiring"
        />
        <MetricsCard
          title="Avg Screening Score"
          value={metricsLoading ? '...' : `${metrics?.avgScreeningScore || 0}%`}
          change={7.5}
          trend="up"
          subtitle="quality of matches"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {!pipelineLoading && pipeline && <PipelineChart data={pipeline} />}
        {!screeningLoading && screeningResults && (
          <ScreeningInsights results={screeningResults.slice(0, 5)} />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {!jobsLoading && jobs && <JobPostingsTable jobs={jobs} />}
        </div>
        <div>
          <AuditLogStream />
        </div>
      </div>
      </div>
    </ErrorBoundary>
  );
}

export default OverviewPage;
