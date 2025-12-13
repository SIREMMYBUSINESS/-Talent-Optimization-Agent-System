import { useState } from 'react';

interface ComplianceFlag {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description?: string;
  timestamp?: string;
}

interface ComplianceFlagModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  candidateName: string;
  jobTitle: string;
  flags: ComplianceFlag[];
  flaggedAt: string;
  onResolveFlagClick?: () => void;
  isLoading?: boolean;
}

const SEVERITY_COLORS = {
  low: 'bg-blue-100 text-blue-800 border-blue-300',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  high: 'bg-red-100 text-red-800 border-red-300',
};

const SEVERITY_DOT_COLORS = {
  low: 'bg-blue-500',
  medium: 'bg-yellow-500',
  high: 'bg-red-500',
};

export function ComplianceFlagModal({
  isOpen,
  onClose,
  applicationId,
  candidateName,
  jobTitle,
  flags,
  flaggedAt,
  onResolveFlagClick,
  isLoading = false,
}: ComplianceFlagModalProps) {
  const [selectedFlag, setSelectedFlag] = useState<number | null>(null);

  if (!isOpen) return null;

  const maxSeverity = flags.length > 0
    ? flags.some(f => f.severity === 'high')
      ? 'high'
      : flags.some(f => f.severity === 'medium')
      ? 'medium'
      : 'low'
    : 'low';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Compliance Flag Review</h2>
            <p className="text-sm text-gray-600 mt-1">{candidateName} - {jobTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 p-4 rounded-lg border" style={{
            borderColor: maxSeverity === 'high' ? '#fee2e2' : maxSeverity === 'medium' ? '#fef3c7' : '#dbeafe',
            backgroundColor: maxSeverity === 'high' ? '#fef2f2' : maxSeverity === 'medium' ? '#fffbeb' : '#f0f9ff',
          }}>
            <div className="flex items-start gap-3">
              <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${SEVERITY_DOT_COLORS[maxSeverity]}`} />
              <div className="flex-1">
                <p className="font-semibold text-gray-900 capitalize">{maxSeverity} Severity</p>
                <p className="text-sm text-gray-600 mt-1">
                  {flags.length} compliance {flags.length === 1 ? 'flag' : 'flags'} detected
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Flagged {new Date(flaggedAt).toLocaleDateString()} at{' '}
                  {new Date(flaggedAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {flags.map((flag, index) => (
              <button
                key={index}
                onClick={() => setSelectedFlag(selectedFlag === index ? null : index)}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  selectedFlag === index
                    ? 'border-gray-400 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${SEVERITY_DOT_COLORS[flag.severity]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 border ${SEVERITY_COLORS[flag.severity]}`}>
                        {flag.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="font-medium text-gray-900 mt-2">{flag.type}</p>
                    {flag.description && (
                      <p className="text-sm text-gray-600 mt-1">{flag.description}</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {flags.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No flags found</p>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between bg-gray-50">
          <div className="text-sm text-gray-600">
            Application ID: {applicationId.substring(0, 8)}...
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            {onResolveFlagClick && (
              <button
                onClick={onResolveFlagClick}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Resolving...' : 'Mark as Reviewed'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
