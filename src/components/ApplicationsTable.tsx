import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { talentService, Application } from '../services/talent.service';
import { LoadingSpinner } from './LoadingSpinner';
import { EmptyState } from './EmptyState';
import { formatDistanceToNow } from 'date-fns';

interface ApplicationsTableProps {
  jobId?: string;
  candidateId?: string;
  statusFilter?: string;
  flaggedOnly?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-800',
  screening: 'bg-yellow-100 text-yellow-800',
  review: 'bg-purple-100 text-purple-800',
  interview: 'bg-indigo-100 text-indigo-800',
  offer: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  withdrawn: 'bg-gray-100 text-gray-800',
  hired: 'bg-emerald-100 text-emerald-800',
};

export function ApplicationsTable({ jobId, candidateId, statusFilter, flaggedOnly }: ApplicationsTableProps) {
  const [page, setPage] = useState(0);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const limit = 20;
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['applications', page, jobId, candidateId, statusFilter, flaggedOnly],
    queryFn: () =>
      talentService.listApplications({
        limit,
        offset: page * limit,
        job_id: jobId,
        candidate_id: candidateId,
        status: statusFilter,
        flagged: flaggedOnly,
      }),
  });

  const screenMutation = useMutation({
    mutationFn: (applicationId: string) =>
      talentService.screenApplication(applicationId, { application_id: applicationId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      talentService.updateApplication(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });

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

  if (!data?.items.length) {
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
              <tr key={application.id} className="hover:bg-gray-50">
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
                <td className="px-6 py-4 whitespace-nowrap">
                  {application.flagged ? (
                    <div className="flex flex-col gap-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Flagged
                      </span>
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
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  {application.status === 'submitted' && (
                    <button
                      onClick={() => screenMutation.mutate(application.id)}
                      disabled={screenMutation.isPending}
                      className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                    >
                      Screen
                    </button>
                  )}
                  <select
                    value={application.status}
                    onChange={(e) =>
                      updateStatusMutation.mutate({ id: application.id, status: e.target.value })
                    }
                    className="text-sm border-gray-300 rounded-md"
                  >
                    <option value="submitted">Submitted</option>
                    <option value="screening">Screening</option>
                    <option value="review">Review</option>
                    <option value="interview">Interview</option>
                    <option value="offer">Offer</option>
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
            disabled={data.items.length < limit}
            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{page * limit + 1}</span> to{' '}
              <span className="font-medium">{page * limit + data.items.length}</span>
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
                disabled={data.items.length < limit}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
