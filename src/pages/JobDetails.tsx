import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { useJobDetails } from '../hooks/useDashboardData';
import { CandidateCard } from '../components/CandidateCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { formatDate } from '../utils/formatters';

function JobDetails() {
  const { jobId } = useParams<{ jobId: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data, isLoading, error } = useJobDetails(jobId || '');

  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  if (!user) return null;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Job Not Found</h2>
          <p className="text-gray-600 mb-6">The job posting you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const { job, applicants } = data;

  const salaryRange = job.salary_range as { min?: number; max?: number } | null;
  const requirements = job.requirements as { experience?: string; skills?: string[] } | null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center"
          >
            <span className="mr-2">←</span>
            Back to Dashboard
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="border-b border-gray-200 pb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{job.title}</h1>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>{job.department}</span>
              <span>•</span>
              <span>{job.location}</span>
              <span>•</span>
              <span>Posted {formatDate(job.created_at)}</span>
            </div>
            {salaryRange && (salaryRange.min || salaryRange.max) && (
              <div className="mt-2 text-lg font-medium text-gray-900">
                ${salaryRange.min?.toLocaleString()} - ${salaryRange.max?.toLocaleString()}
              </div>
            )}
          </div>

          <div className="py-6 space-y-4">
            {job.description && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-700">{job.description}</p>
              </div>
            )}

            {requirements && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Requirements</h3>
                {requirements.experience && (
                  <p className="text-gray-700 mb-2">
                    <span className="font-medium">Experience:</span> {requirements.experience}
                  </p>
                )}
                {requirements.skills && requirements.skills.length > 0 && (
                  <div>
                    <p className="font-medium text-gray-700 mb-2">Required Skills:</p>
                    <div className="flex flex-wrap gap-2">
                      {requirements.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Applicants ({applicants.length})
            </h2>
            <div className="flex items-center space-x-2">
              <button className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                Filter
              </button>
              <button className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                Sort
              </button>
            </div>
          </div>

          {applicants.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-500">No applicants yet for this position.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {applicants.map((applicant) => (
                <CandidateCard
                  key={applicant.applicationId}
                  applicationId={applicant.applicationId}
                  status={applicant.status}
                  appliedAt={applicant.appliedAt}
                  notes={applicant.notes}
                  candidate={applicant.candidate}
                  screening={applicant.screening}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default JobDetails;
