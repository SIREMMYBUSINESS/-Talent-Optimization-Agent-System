interface QuickActionsBarProps {
  onViewFlaggedResumes: () => void;
  onExportAuditReport: () => void;
  onCompareDPModels: () => void;
  onReviewOverrides: () => void;
}

export function QuickActionsBar({
  onViewFlaggedResumes,
  onExportAuditReport,
  onCompareDPModels,
  onReviewOverrides,
}: QuickActionsBarProps) {
  const actions = [
    {
      label: 'View Flagged Resumes',
      icon: '⚠️',
      onClick: onViewFlaggedResumes,
      description: 'Review candidates with compliance flags',
    },
    {
      label: 'Export Audit Report',
      icon: '📊',
      onClick: onExportAuditReport,
      description: 'Download audit logs and metrics',
    },
    {
      label: 'Compare DP Models',
      icon: '🔍',
      onClick: onCompareDPModels,
      description: 'Analyze DP vs non-DP accuracy',
    },
    {
      label: 'Review Overrides',
      icon: '✓',
      onClick: onReviewOverrides,
      description: 'Manage manager escalations',
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6 sticky bottom-0 z-40">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className="flex flex-col items-start p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all hover:bg-blue-50"
            title={action.description}
          >
            <span className="text-xl mb-2">{action.icon}</span>
            <span className="text-sm font-medium text-gray-900">{action.label}</span>
            <span className="text-xs text-gray-500 mt-1">{action.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
