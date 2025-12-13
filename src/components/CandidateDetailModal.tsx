import { useState } from 'react';
import { useCandidate } from '../hooks/useDashboardData';
import { LoadingSpinner } from './LoadingSpinner';

interface CandidateDetailModalProps {
  candidateId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CandidateDetailModal({ candidateId, isOpen, onClose }: CandidateDetailModalProps) {
  const { data: candidate, isLoading, error } = useCandidate(isOpen ? candidateId : null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center items-center min-h-96">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 border border-red-200 rounded-lg m-4">
            <p className="text-red-800">Failed to load candidate: {(error as Error).message}</p>
          </div>
        ) : candidate ? (
          <div className="divide-y divide-gray-200">
            <div className="p-6 bg-gradient-to-r from-blue-50 to-blue-100">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{candidate.fullName}</h2>
                  <p className="text-gray-600 mt-1">{candidate.email}</p>
                  {candidate.phone && <p className="text-gray-600">{candidate.phone}</p>}
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
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Experience</h3>
                  <p className="mt-2 text-lg font-semibold text-gray-900">{candidate.experienceYears} years</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Source</h3>
                  <p className="mt-2 text-lg font-semibold text-gray-900 capitalize">{candidate.source}</p>
                </div>
              </div>

              {candidate.skills.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {candidate.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {candidate.education && candidate.education.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Education</h3>
                  <div className="space-y-2">
                    {candidate.education.map((edu: any, idx: number) => (
                      <div key={idx} className="bg-gray-50 rounded p-3">
                        <p className="font-medium text-gray-900">{edu.degree || 'N/A'}</p>
                        <p className="text-sm text-gray-600">{edu.school || 'N/A'}</p>
                        {edu.year && <p className="text-sm text-gray-500">{edu.year}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {candidate.resumeUrl && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Resume</h3>
                  <a
                    href={candidate.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                  >
                    View Resume
                  </a>
                </div>
              )}

              {candidate.linkedinUrl && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">LinkedIn</h3>
                  <a
                    href={candidate.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    View Profile
                  </a>
                </div>
              )}

              {candidate.applications && candidate.applications.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Applications</h3>
                  <div className="space-y-3">
                    {candidate.applications.map((app) => (
                      <div key={app.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium text-gray-900">{app.job?.title || 'Unknown Job'}</p>
                            <p className="text-sm text-gray-600">
                              {app.job?.department && `${app.job.department}`}
                              {app.job?.location && ` • ${app.job.location}`}
                            </p>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            app.status === 'hired' ? 'bg-green-100 text-green-800' :
                            app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            app.status === 'offer' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {app.status}
                          </span>
                        </div>
                        {app.screening && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-sm">
                              <span className="font-medium">Screening Score:</span>{' '}
                              <span className="text-blue-600 font-semibold">{app.screening.overallScore}%</span>
                            </p>
                            <p className="text-sm mt-1">
                              <span className="font-medium">Recommendation:</span>{' '}
                              <span className="capitalize">{app.screening.recommendation}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Close
              </button>
              <button
                onClick={() => {
                  if (candidate.resumeUrl) {
                    window.open(candidate.resumeUrl, '_blank');
                  }
                }}
                disabled={!candidate.resumeUrl}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Download Resume
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
