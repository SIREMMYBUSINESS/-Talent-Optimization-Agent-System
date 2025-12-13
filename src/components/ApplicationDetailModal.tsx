import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface Candidate {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  skills: string[];
  experienceYears?: number;
}

interface ScreeningResult {
  id: string;
  overallScore: number;
  recommendation: string;
  skillsMatch: Array<{ matched: string[] }>;
  biasFlags?: string[];
}

interface ApplicationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate?: Candidate;
  jobTitle?: string;
  status: string;
  appliedAt: string;
  screening?: ScreeningResult;
  notes?: string;
  onStatusChange?: (status: string) => void;
  isLoading?: boolean;
}

const STATUS_OPTIONS = [
  'submitted',
  'screening_submitted',
  'screening_reviewed',
  'review',
  'interview_scheduled',
  'offer_extended',
  'rejected',
  'withdrawn',
  'hired',
];

export function ApplicationDetailModal({
  isOpen,
  onClose,
  candidate,
  jobTitle,
  status,
  appliedAt,
  screening,
  notes,
  onStatusChange,
  isLoading = false,
}: ApplicationDetailModalProps) {
  const [selectedStatus, setSelectedStatus] = useState(status);

  if (!isOpen || !candidate) return null;

  const handleStatusSubmit = () => {
    if (selectedStatus !== status && onStatusChange) {
      onStatusChange(selectedStatus);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Application Details</h2>
            <p className="text-sm text-gray-600 mt-1">{jobTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Candidate Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Full Name</p>
                <p className="font-medium text-gray-900">{candidate.fullName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium text-gray-900">{candidate.email}</p>
              </div>
              {candidate.phone && (
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium text-gray-900">{candidate.phone}</p>
                </div>
              )}
              {candidate.experienceYears !== undefined && (
                <div>
                  <p className="text-sm text-gray-600">Years of Experience</p>
                  <p className="font-medium text-gray-900">{candidate.experienceYears}</p>
                </div>
              )}
            </div>

            {candidate.skills && candidate.skills.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Skills</p>
                <div className="flex flex-wrap gap-2">
                  {candidate.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {screening && (
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Screening Results</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-600 font-medium">Overall Score</p>
                  <p className="text-3xl font-bold text-blue-900 mt-1">{screening.overallScore}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 font-medium">Recommendation</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1 capitalize">
                    {screening.recommendation.replace('_', ' ')}
                  </p>
                </div>
              </div>

              {screening.skillsMatch && screening.skillsMatch.length > 0 && screening.skillsMatch[0]?.matched && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">Matched Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {screening.skillsMatch[0].matched.map((skill, idx) => (
                      <span key={idx} className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Applied</p>
                <p className="font-medium text-gray-900">
                  {formatDistanceToNow(new Date(appliedAt), { addSuffix: true })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Current Status</p>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
                {selectedStatus !== status && (
                  <button
                    onClick={handleStatusSubmit}
                    disabled={isLoading}
                    className="mt-2 px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Updating...' : 'Update Status'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {notes && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Notes</h3>
              <p className="text-gray-600 bg-gray-50 p-4 rounded-lg">{notes}</p>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-end bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
