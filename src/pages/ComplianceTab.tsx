import { useState } from 'react';
import { TimeRangeFilter } from '../types/dashboard';
import { TimeRangeSelector } from '../components';
import {
  ViolationTracker,
  AuditLogViewer,
  ApprovalWorkflow,
  RetrieverSummary,
  FilterPanel,
} from '../components';
import { useComplianceViolations, useAuditLogs } from '../hooks/useDashboardData';

export function ComplianceTab() {
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>({ preset: '30d' });
  const [searchTerm, setSearchTerm] = useState('');
  const { data: violations, isLoading: violationsLoading } = useComplianceViolations(timeRange);
  const { data: auditLogs, isLoading: auditLogsLoading } = useAuditLogs(timeRange, searchTerm);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Compliance & Governance</h2>
        <TimeRangeSelector selectedRange={timeRange} onChange={setTimeRange} />
      </div>

      <ViolationTracker data={violations} isLoading={violationsLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AuditLogViewer data={auditLogs} isLoading={auditLogsLoading} onSearch={setSearchTerm} />
        </div>
        <div className="space-y-6">
          <ApprovalWorkflow />
          <RetrieverSummary />
        </div>
      </div>
    </div>
  );
}
