import { formatDateTime } from '../utils/formatters';
import Modal from "../components/Modal";
interface ScreeningResult {
  id: string;
  candidateName: string;
  jobTitle: string;
  overallScore: number;
  recommendation: string;
  matchedSkills: string[];
  biasFlags: string[];
  screenedAt: string;
}

interface ScreeningInsightsProps {
  results: ScreeningResult[];
}

export function ScreeningInsights({ results }: ScreeningInsightsProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getRecommendationBadge = (recommendation: string) => {
    const badges: Record<string, string> = {
      strong_match: 'bg-green-100 text-green-800',
      good_match: 'bg-blue-100 text-blue-800',
      potential_match: 'bg-yellow-100 text-yellow-800',
      no_match: 'bg-red-100 text-red-800',
    };
    return badges[recommendation] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Resume Screening Insights</h3>
      </div>
      <div className="divide-y divide-gray-200">
        {results.map((result) => (
          <div key={result.id} className="px-6 py-4 hover:bg-gray-50">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <h4 className="text-sm font-medium text-gray-900">{result.candidateName}</h4>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRecommendationBadge(result.recommendation)}`}>
                    {result.recommendation.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">{result.jobTitle}</p>

                {result.matchedSkills.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {result.matchedSkills.slice(0, 5).map((skill, idx) => (
                      <span key={idx} className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                {result.biasFlags.length > 0 && (
                  <div className="mt-2 flex items-center space-x-2">
                    <span className="text-xs font-medium text-red-600">⚠ Bias Flags:</span>
                    <span className="text-xs text-red-500">{result.biasFlags.length} detected</span>
                  </div>
                )}

                <p className="mt-2 text-xs text-gray-400">{formatDateTime(result.screenedAt)}</p>
              </div>

              <div className={`ml-4 px-3 py-2 rounded-lg text-center ${getScoreColor(result.overallScore)}`}>
                <div className="text-2xl font-bold">{result.overallScore}</div>
                <div className="text-xs">Score</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
