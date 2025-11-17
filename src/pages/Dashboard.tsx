import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { DashboardLayout } from "../layouts/DashboardLayout";

// ✅ Use barrel exports for components
import {
  MetricsCard,
  PipelineChart,
  JobPostingsTable,
  ScreeningInsights,
  AuditLogStream,
} from "../components";

// ✅ Grouped hooks
import {
  useDashboardMetrics,
  useCandidatePipeline,
  useJobPostings,
  useScreeningResults,
} from "../hooks/useDashboardData";

// ✅ Utilities
import { formatNumber } from "../utils/formatters";

function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics();
  const { data: pipeline, isLoading: pipelineLoading } = useCandidatePipeline();
  const { data: jobs, isLoading: jobsLoading } = useJobPostings();
  const { data: screeningResults, isLoading: screeningLoading } = useScreeningResults(10);

  useEffect(() => {
    if (!user) {
      navigate("/login"); // ✅ redirect to login instead of root
    }
  }, [user, navigate]);

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricsCard
            title="Total Candidates"
            value={metricsLoading ? "..." : formatNumber(metrics?.totalCandidates || 0)}
            change={5.2}
            trend="up"
            subtitle="vs last month"
          />
          <MetricsCard
            title="Active Applications"
            value={metricsLoading ? "..." : formatNumber(metrics?.totalApplications || 0)}
            change={12.8}
            trend="up"
            subtitle="in review pipeline"
          />
          <MetricsCard
            title="Open Positions"
            value={metricsLoading ? "..." : formatNumber(metrics?.activeJobs || 0)}
            change={-3.1}
            trend="down"
            subtitle="currently hiring"
          />
          <MetricsCard
            title="Avg Screening Score"
            value={metricsLoading ? "..." : `${metrics?.avgScreeningScore || 0}%`}
            change={7.5}
            trend="up"
            subtitle="quality of matches"
          />
        </div>

        {/* Pipeline + Screening */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {!pipelineLoading && pipeline && <PipelineChart data={pipeline} />}
          {!screeningLoading && screeningResults && (
            <ScreeningInsights results={screeningResults.slice(0, 5)} />
          )}
        </div>

        {/* Jobs + Audit */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {!jobsLoading && jobs && <JobPostingsTable jobs={jobs} />}
          </div>
          <div>
            <AuditLogStream />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;
