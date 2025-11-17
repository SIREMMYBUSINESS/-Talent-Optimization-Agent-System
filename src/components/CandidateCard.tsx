import { formatDateTime, getStatusColor } from '../utils/formatters';
import Modal from "../components/Modal"
interface Candidate {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  resumeUrl?: string;
  linkedinUrl?: string;
  skills: string[];
  experienceYears: number;
}

interface Screening {
  id: string;
  overallScore: number;
  recommendation: string;
  skillsMatch: {
    matched?: string[];
    missing?: string[];
  };
  biasFlags: string[];
  screenedAt: string;
}

interface CandidateCardProps {
  applicationId: string;
  status: string;
  appliedAt: string;
  notes?: string;
  candidate: Candidate;
  screening?: Screening | null;
}

export function CandidateCard({
  status,
  appliedAt,
  notes,
  candidate,
  screening,
}: CandidateCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getRecommendationColor = (recommendation: string) => {
    const colors: Record<string, string> = {
      strong_match: 'bg-green-100 text-green-800',
      good_match: 'bg-blue-100 text-blue-800',
      potential_match: 'bg-yellow-100 text-yellow-800',
      no_match: 'bg-red-100 text-red-800',
    };
    return colors[recommendation] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{candidate.fullName}</h3>
          <div className="mt-1 space-y-1">
            <p className="text-sm text-gray-600">{candidate.email}</p>
            {candidate.phone && (
              <p className="text-sm text-gray-600">{candidate.phone}</p>
            )}
          </div>
          <div className="mt-2 flex items-center space-x-2">
            <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(status)}`}>
              {status}
            </span>
            <span className="text-xs text-gray-500">
              Applied {formatDateTime(appliedAt)}
            </span>
          </div>
        </div>

        {screening && (
          <div className={`px-4 py-2 rounded-lg text-center ${getScoreColor(screening.overallScore)}`}>
            <div className="text-2xl font-bold">{screening.overallScore}</div>
            <div className="text-xs">Score</div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">EXPERIENCE</p>
          <p className="text-sm text-gray-900">{candidate.experienceYears} years</p>
        </div>

        {candidate.skills && candidate.skills.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">SKILLS</p>
            <div className="flex flex-wrap gap-1">
              {candidate.skills.slice(0, 10).map((skill, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {screening && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">SCREENING RESULTS</p>
            <div className="space-y-2">
              <div>
                <span className={`px-2 py-1 text-xs font-medium rounded ${getRecommendationColor(screening.recommendation)}`}>
                  {screening.recommendation.replace(/_/g, ' ').toUpperCase()}
                </span>
              </div>

              {screening.skillsMatch?.matched && screening.skillsMatch.matched.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-green-600 mb-1">Matched Skills</p>
                  <div className="flex flex-wrap gap-1">
                    {screening.skillsMatch.matched.slice(0, 5).map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {screening.skillsMatch?.missing && screening.skillsMatch.missing.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Missing Skills</p>
                  <div className="flex flex-wrap gap-1">
                    {screening.skillsMatch.missing.slice(0, 3).map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 text-xs bg-gray-50 text-gray-600 rounded"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {screening.biasFlags && screening.biasFlags.length > 0 && (
                <div className="flex items-center space-x-2 text-red-600">
                  <span className="text-xs font-medium">Bias Flags:</span>
                  <span className="text-xs">{screening.biasFlags.length} detected</span>
                </div>
              )}
            </div>
          </div>
        )}

        {notes && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">NOTES</p>
            <p className="text-sm text-gray-700">{notes}</p>
          </div>
        )}

        <div className="flex items-center space-x-3 pt-3 border-t border-gray-100">
          {candidate.resumeUrl && (
            <a
              href={candidate.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View Resume
            </a>
          )}
          {candidate.linkedinUrl && (
            <a
              href={candidate.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              LinkedIn Profile
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
