import { useState } from 'react';
import { useApplications, useApplicationActions } from '../hooks/useDashboardData';
import { LoadingSpinner } from './LoadingSpinner';
import { EmptyState } from './EmptyState';
import { ApplicationDetailModal } from './ApplicationDetailModal';
import { ComplianceFlagModal } from './ComplianceFlagModal';
import { formatDistanceToNow } from 'date-fns';

interface ApplicationsTableProps {
  jobId?: string;
  candidateId?: string;
  statusFilter?: string;
  flaggedOnly?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-800',
  screening_submitted: 'bg-blue-100 text-blue-800',
  screening_reviewed: 'bg-yellow-100 text-yellow-800',
  review: 'bg-orange-100 text-orange-800',
  interview_scheduled: 'bg-indigo-100 text-indigo-800',
  offer_extended: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  withdrawn: 'bg-gray-100 text-gray-800',
  hired: 'bg-emerald-100 text-emerald-800',
};

export function ApplicationsTable({ jobId, candidateId, statusFilter, flaggedOnly }: ApplicationsTableProps) {
  const [page, setPage] = useState(0);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const limit = 20;

  const { data, isLoading, error } = useApplications({
    limit,
    offset: page * limit,
    job_id: jobId,
    candidate_id: candidateId,
    status: statusFilter,
    flagged: flaggedOnly,
  });

  const { updateStatus } = useApplicationActions();

  const openDetailModal = (application: any) => {
    setSelectedApplication(application);
    setDetailModalOpen(true);
  };

  const openFlagModal = (application: any) => {
    setSelectedApplication(application);
    setFlagModalOpen(true);
  };

  const handleStatusChange = (status: string) => {
    if (selectedApplication) {
      updateStatus.mutate({ id: selectedApplication.id, status });
      setDetailModalOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Failed to load applications: {(error as Error).message}</p>
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return <EmptyState message="No applications found" />;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Candidate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Job
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Flags
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Applied
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.items.map((application) => (
              <tr
                key={application.id}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => openDetailModal(application)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {application.candidates?.full_name || 'Unknown'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {application.candidates?.email || ''}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {application.job_postings?.title || 'Unknown'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {application.job_postings?.department || ''}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      STATUS_COLORS[application.status] || 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {application.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  {application.flagged ? (
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => openFlagModal(application)}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 transition-colors cursor-pointer"
                      >
                        Flagged
                      </button>
                      {application.compliance_flags && application.compliance_flags.length > 0 && (
                        <div className="text-xs text-gray-600">
                          {application.compliance_flags.map((flag, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                              <span className={`inline-block w-2 h-2 rounded-full ${
                                flag.severity === 'high' ? 'bg-red-500' :
                                flag.severity === 'medium' ? 'bg-yellow-500' :
                                'bg-blue-500'
                              }`} />
                              {flag.type}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDistanceToNow(new Date(application.applied_at), { addSuffix: true })}
                </td>
                <td
                  className="px-6 py-4 whitespace-nowrap text-sm font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  <select
                    value={application.status}
                    onChange={(e) =>
                      updateStatus.mutate({ id: application.id, status: e.target.value })
                    }
                    disabled={updateStatus.isPending}
                    className="text-sm border border-gray-300 rounded-md px-2 py-1 disabled:opacity-50"
                  >
                    <option value="submitted">Submitted</option>
                    <option value="screening_submitted">Screening Submitted</option>
                    <option value="screening_reviewed">Screening Reviewed</option>
                    <option value="review">Review</option>
                    <option value="interview_scheduled">Interview Scheduled</option>
                    <option value="offer_extended">Offer Extended</option>
                    <option value="rejected">Rejected</option>
                    <option value="withdrawn">Withdrawn</option>
                    <option value="hired">Hired</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={(data?.items?.length || 0) < limit}
            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{page * limit + 1}</span> to{' '}
              <span className="font-medium">{page * limit + (data?.items?.length || 0)}</span> of{' '}
              <span className="font-medium">{data?.total || 0}</span>
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={(data?.items?.length || 0) < limit}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </nav>
          </div>
        </div>
      </div>

      {selectedApplication && (
        <>
          <ApplicationDetailModal
            isOpen={detailModalOpen}
            onClose={() => setDetailModalOpen(false)}
            candidate={{
              id: selectedApplication.candidates?.id || '',
              fullName: selectedApplication.candidates?.full_name || 'Unknown',
              email: selectedApplication.candidates?.email || '',
              skills: [],
            }}
            jobTitle={selectedApplication.job_postings?.title || 'Unknown'}
            status={selectedApplication.status}
            appliedAt={selectedApplication.applied_at}
            notes={selectedApplication.notes}
            onStatusChange={handleStatusChange}
            isLoading={updateStatus.isPending}
          />

          <ComplianceFlagModal
            isOpen={flagModalOpen}
            onClose={() => setFlagModalOpen(false)}
            applicationId={selectedApplication.id}
            candidateName={selectedApplication.candidates?.full_name || 'Unknown'}
            jobTitle={selectedApplication.job_postings?.title || 'Unknown'}
            flags={selectedApplication.compliance_flags || []}
            flaggedAt={selectedApplication.applied_at}
          />
        </>
      )}
    </div>
  );
}
