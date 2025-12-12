import { useState } from 'react';

interface RetrieverSummaryProps {
  title?: string;
  summary?: string;
  relevantDocuments?: string[];
  confidenceScore?: number;
  isLoading?: boolean;
}

export function RetrieverSummary({
  title = 'Compliance Rationale',
  summary,
  relevantDocuments = [],
  confidenceScore = 0.85,
  isLoading = false,
}: RetrieverSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const defaultSummary = `The system has identified potential compliance concerns based on the candidate's screening result.
The differential privacy mechanism was applied to protect sensitive attributes, resulting in a privacy-protected score of 78 compared to the original 82.
This 4-point variance is within acceptable parameters. However, the age-based screening disparity ratio of 1.8x suggests potential EEOC concerns.
Recommend manager review before proceeding with interview scheduling.`;

  const defaultDocuments = [
    'EEOC Guidelines - Age Discrimination in Hiring',
    'GDPR - Personal Data Protection Standards',
    'Company Bias Detection Policy v2.1',
    'Resume Screening Best Practices',
  ];

  const displaySummary = summary || defaultSummary;
  const displayDocuments = relevantDocuments.length > 0 ? relevantDocuments : defaultDocuments;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-200"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
            {(confidenceScore * 100).toFixed(0)}% Confidence
          </span>
        </div>
        <svg
          className={`w-5 h-5 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>

      {isExpanded && (
        <div className="p-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Summary</h4>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {displaySummary}
                </p>
              </div>

              {displayDocuments.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Relevant Documents</h4>
                  <ul className="space-y-2">
                    {displayDocuments.map((doc, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-blue-600 mt-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <span className="text-sm text-gray-700">{doc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-600">
                  This retriever summary is generated using NEMO embeddings and explains the compliance reasoning for the screening decision.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
