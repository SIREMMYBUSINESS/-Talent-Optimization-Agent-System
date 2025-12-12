import { ComplianceAlert } from '../types/dashboard';
import { formatTimeAgo } from '../utils/formatters';
import { useComplianceAlertActions } from '../hooks/useDashboardData';

interface ComplianceAlertsPanelProps {
  alerts: ComplianceAlert[];
  isLoading: boolean;
}

const severityColors = {
  high: 'bg-red-50 border-red-200',
  medium: 'bg-orange-50 border-orange-200',
  low: 'bg-yellow-50 border-yellow-200',
};

const severityBadgeColors = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-orange-100 text-orange-800',
  low: 'bg-yellow-100 text-yellow-800',
};

const statusBadgeColors = {
  open: 'bg-blue-100 text-blue-800',
  reviewed: 'bg-purple-100 text-purple-800',
  escalated: 'bg-red-100 text-red-800',
};

export function ComplianceAlertsPanel({ alerts, isLoading }: ComplianceAlertsPanelProps) {
  const { markAsReviewed, escalate, resolve, isLoading: isActionsLoading } = useComplianceAlertActions();

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Compliance Alerts</h2>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-md animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Compliance Alerts</h2>
        <div className="text-center py-8">
          <p className="text-gray-500">No active compliance alerts</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Compliance Alerts</h2>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`border-l-4 p-4 rounded-md ${
              severityColors[alert.severity]
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded ${
                    severityBadgeColors[alert.severity]
                  }`}
                >
                  {alert.severity.toUpperCase()}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {alert.flagType}
                </span>
                <span className="text-xs text-gray-500">
                  {formatTimeAgo(alert.timestamp)}
                </span>
              </div>
              <span
                className={`text-xs font-semibold px-2 py-1 rounded ${
                  statusBadgeColors[alert.status]
                }`}
              >
                {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
              </span>
            </div>

            <p className="text-sm text-gray-700 mb-3">{alert.description}</p>

            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-600">
                Affected candidates: <span className="font-semibold">{alert.affectedCandidateCount}</span>
              </div>

              {alert.actionable && (
                <div className="flex gap-2">
                  {alert.status === 'open' && (
                    <button
                      onClick={() => markAsReviewed(alert.id)}
                      disabled={isActionsLoading}
                      className="px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      Review
                    </button>
                  )}
                  {alert.status === 'reviewed' && (
                    <button
                      onClick={() => escalate(alert.id)}
                      disabled={isActionsLoading}
                      className="px-2 py-1 text-xs font-medium bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 transition-colors"
                    >
                      Escalate
                    </button>
                  )}
                  {alert.status === 'escalated' && (
                    <button
                      onClick={() => resolve(alert.id)}
                      disabled={isActionsLoading}
                      className="px-2 py-1 text-xs font-medium bg-gray-400 text-white rounded cursor-not-allowed opacity-50"
                    >
                      Resolving...
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
