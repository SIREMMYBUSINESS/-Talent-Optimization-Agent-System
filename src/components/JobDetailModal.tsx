import { useState } from 'react';
import { useJobDetails } from '../hooks/useDashboardData';
import { LoadingSpinner } from './LoadingSpinner';

interface JobDetailModalProps {
  jobId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function JobDetailModal({ jobId, isOpen, onClose }: JobDetailModalProps) {
  const { data, isLoading, error } = useJobDetails(isOpen ? jobId : '');
  const [selectedApplicantFilter, setSelectedApplicantFilter] = useState('all');

  if (!isOpen) return null;

  const job = data?.job;
  const allApplicants = data?.applicants || [];
  const filteredApplicants = selectedApplicantFilter === 'all'
    ? allApplicants
    : allApplicants.filter((app) => app.status === selectedApplicantFilter);

  const salaryMin = job?.salary_range?.min ? `$${(job.salary_range.min / 1000).toFixed(0)}k` : 'Not specified';
  const salaryMax = job?.salary_range?.max ? `$${(job.salary_range.max / 1000).toFixed(0)}k` : '';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center items-center min-h-96">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 border border-red-200 rounded-lg m-4">
            <p className="text-red-800">Failed to load job details: {(error as Error).message}</p>
          </div>
        ) : job ? (
          <div className="divide-y divide-gray-200">
            <div className="p-6 bg-gradient-to-r from-blue-50 to-blue-100">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900">{job.title}</h2>
                  <p className="text-gray-600 mt-1">{job.department || 'No department'}</p>
                  {job.location && <p className="text-gray-600">{job.location}</p>}
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-light"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</h3>
                  <span className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    job.status === 'published' ? 'bg-green-100 text-green-800' :
                    job.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {job.status}
                  </span>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Employment Type</h3>
                  <p className="mt-2 text-sm font-medium text-gray-900 capitalize">{job.employment_type || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Salary Range</h3>
                  <p className="mt-2 text-sm font-medium text-gray-900">
                    {salaryMax ? `${salaryMin} - ${salaryMax}` : salaryMin}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Applicants</h3>
                  <p className="mt-2 text-lg font-semibold text-blue-600">{allApplicants.length}</p>
                </div>
              </div>

              {job.description && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Description</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
                </div>
              )}

              {job.requirements && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Requirements</h3>
                  {Array.isArray(job.requirements) ? (
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      {job.requirements.map((req: string, idx: number) => (
                        <li key={idx}>{req}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-700">{JSON.stringify(job.requirements)}</p>
                  )}
                </div>
              )}

              {allApplicants.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Applicants</h3>
                    <select
                      value={selectedApplicantFilter}
                      onChange={(e) => setSelectedApplicantFilter(e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All ({allApplicants.length})</option>
                      <option value="submitted">Submitted ({allApplicants.filter((a) => a.status === 'submitted').length})</option>
                      <option value="screening">Screening ({allApplicants.filter((a) => a.status === 'screening').length})</option>
                      <option value="interview">Interview ({allApplicants.filter((a) => a.status === 'interview').length})</option>
                      <option value="offer">Offer ({allApplicants.filter((a) => a.status === 'offer').length})</option>
                      <option value="hired">Hired ({allApplicants.filter((a) => a.status === 'hired').length})</option>
                      <option value="rejected">Rejected ({allApplicants.filter((a) => a.status === 'rejected').length})</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    {filteredApplicants.map((applicant) => (
                      <div key={applicant.applicationId} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium text-gray-900">{applicant.candidate.fullName}</p>
                            <p className="text-sm text-gray-600">{applicant.candidate.email}</p>
                            {applicant.candidate.phone && (
                              <p className="text-sm text-gray-600">{applicant.candidate.phone}</p>
                            )}
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            applicant.status === 'hired' ? 'bg-green-100 text-green-800' :
                            applicant.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            applicant.status === 'offer' ? 'bg-blue-100 text-blue-800' :
                            applicant.status === 'interview' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {applicant.status}
                          </span>
                        </div>

                        {applicant.screening && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Screening Score</p>
                                <p className="mt-1 text-2xl font-bold text-blue-600">{applicant.screening.overallScore}%</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recommendation</p>
                                <p className="mt-1 text-sm font-medium text-gray-900 capitalize">
                                  {applicant.screening.recommendation}
                                </p>
                              </div>
                            </div>

                            {applicant.screening.skillsMatch && Object.keys(applicant.screening.skillsMatch).length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs text-gray-600 mb-1">Skills Match:</p>
                                <div className="flex flex-wrap gap-1">
                                  {Array.isArray(applicant.screening.skillsMatch) ? (
                                    applicant.screening.skillsMatch.slice(0, 3).map((skill: string, idx: number) => (
                                      <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                        {skill}
                                      </span>
                                    ))
                                  ) : (
                                    Object.entries(applicant.screening.skillsMatch).slice(0, 3).map(([skill]) => (
                                      <span key={skill} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                        {skill}
                                      </span>
                                    ))
                                  )}
                                </div>
                              </div>
                            )}

                            {applicant.screening.biasFlags && applicant.screening.biasFlags.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs text-red-600 font-semibold">Bias Flags:</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {applicant.screening.biasFlags.slice(0, 2).map((flag: string, idx: number) => (
                                    <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                      {flag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="mt-3 pt-3 border-t border-gray-200 flex gap-2">
                          {applicant.candidate.resumeUrl && (
                            <a
                              href={applicant.candidate.resumeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                              View Resume
                            </a>
                          )}
                          {applicant.candidate.linkedinUrl && (
                            <a
                              href={applicant.candidate.linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                              LinkedIn
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
