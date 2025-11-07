import { useState } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';

interface ScreeningResult {
  id: string;
  candidateName: string;
  jobTitle: string;
  overallScore: number;
  recommendation: 'strong_match' | 'good_match' | 'potential_match' | 'not_recommended';
  matchedSkills: string[];
  biasFlags: string[];
  screenedAt: string;
  resumeUrl?: string;
}

const mockScreeningResults: ScreeningResult[] = [
  {
    id: '1',
    candidateName: 'Sarah Johnson',
    jobTitle: 'Senior Frontend Developer',
    overallScore: 92,
    recommendation: 'strong_match',
    matchedSkills: ['React', 'TypeScript', 'Node.js', 'AWS'],
    biasFlags: [],
    screenedAt: '2025-11-06T10:30:00Z',
  },
  {
    id: '2',
    candidateName: 'Michael Chen',
    jobTitle: 'Backend Engineer',
    overallScore: 85,
    recommendation: 'good_match',
    matchedSkills: ['Python', 'Django', 'PostgreSQL', 'Docker'],
    biasFlags: [],
    screenedAt: '2025-11-06T09:15:00Z',
  },
  {
    id: '3',
    candidateName: 'Emily Rodriguez',
    jobTitle: 'Product Manager',
    overallScore: 78,
    recommendation: 'potential_match',
    matchedSkills: ['Product Strategy', 'Agile', 'User Research'],
    biasFlags: ['age_inference_detected'],
    screenedAt: '2025-11-05T16:45:00Z',
  },
  {
    id: '4',
    candidateName: 'James Wilson',
    jobTitle: 'DevOps Engineer',
    overallScore: 65,
    recommendation: 'not_recommended',
    matchedSkills: ['Linux', 'Jenkins'],
    biasFlags: [],
    screenedAt: '2025-11-05T14:20:00Z',
  },
];

function ScreeningPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [recommendationFilter, setRecommendationFilter] = useState<string>('all');
  const [isLoading] = useState(false);

  const filteredResults = mockScreeningResults.filter((result) => {
    const matchesSearch = result.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.jobTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRecommendation = recommendationFilter === 'all' || result.recommendation === recommendationFilter;
    return matchesSearch && matchesRecommendation;
  });

  const getRecommendationColor = (recommendation: string) => {
    const colors = {
      strong_match: 'bg-green-100 text-green-800',
      good_match: 'bg-blue-100 text-blue-800',
      potential_match: 'bg-yellow-100 text-yellow-800',
      not_recommended: 'bg-red-100 text-red-800',
    };
    return colors[recommendation as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getRecommendationLabel = (recommendation: string) => {
    const labels = {
      strong_match: 'Strong Match',
      good_match: 'Good Match',
      potential_match: 'Potential Match',
      not_recommended: 'Not Recommended',
    };
    return labels[recommendation as keyof typeof labels] || recommendation;
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">AI Screening Results</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
          Run Bulk Screening
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Total Screened</div>
          <div className="text-3xl font-bold text-gray-900">{mockScreeningResults.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Strong Matches</div>
          <div className="text-3xl font-bold text-green-600">
            {mockScreeningResults.filter(r => r.recommendation === 'strong_match').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Avg Score</div>
          <div className="text-3xl font-bold text-blue-600">
            {Math.round(mockScreeningResults.reduce((acc, r) => acc + r.overallScore, 0) / mockScreeningResults.length)}%
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Bias Flags</div>
          <div className="text-3xl font-bold text-red-600">
            {mockScreeningResults.filter(r => r.biasFlags.length > 0).length}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by candidate name or job title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={recommendationFilter}
            onChange={(e) => setRecommendationFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Recommendations</option>
            <option value="strong_match">Strong Match</option>
            <option value="good_match">Good Match</option>
            <option value="potential_match">Potential Match</option>
            <option value="not_recommended">Not Recommended</option>
          </select>
        </div>

        {filteredResults.length === 0 ? (
          <EmptyState message="No screening results found matching your criteria" />
        ) : (
          <div className="space-y-4">
            {filteredResults.map((result) => (
              <div
                key={result.id}
                className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{result.candidateName}</h3>
                    <p className="text-sm text-gray-600">{result.jobTitle}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-gray-600 mb-1">Overall Score</div>
                      <div className={`text-3xl font-bold ${getScoreColor(result.overallScore)}`}>
                        {result.overallScore}%
                      </div>
                    </div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getRecommendationColor(result.recommendation)}`}>
                      {getRecommendationLabel(result.recommendation)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Matched Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.matchedSkills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Bias Detection</h4>
                    {result.biasFlags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {result.biasFlags.map((flag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded flex items-center"
                          >
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {flag.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-green-600 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        No bias detected
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <span className="text-sm text-gray-500">
                    Screened {new Date(result.screenedAt).toLocaleString()}
                  </span>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800">
                      View Details
                    </button>
                    <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800">
                      Download Report
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </ErrorBoundary>
  );
}

export default ScreeningPage;
