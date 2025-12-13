interface WorkflowStep {
  id: string;
  label: string;
  status: 'pending' | 'completed' | 'current';
  timestamp?: string;
  notes?: string;
}

interface ApprovalWorkflowProps {
  steps?: WorkflowStep[];
  onApprove?: () => void;
  onEscalate?: () => void;
  isLoading?: boolean;
}

export function ApprovalWorkflow({
  steps,
  onApprove,
  onEscalate,
  isLoading = false,
}: ApprovalWorkflowProps) {
  const defaultSteps: WorkflowStep[] = [
    {
      id: '1',
      label: 'Initial Screening',
      status: 'completed',
      timestamp: 'Completed 2 hours ago',
      notes: 'Automated screening flagged for bias concern',
    },
    {
      id: '2',
      label: 'Manager Review',
      status: 'current',
      notes: 'Awaiting manager approval',
    },
    {
      id: '3',
      label: 'Compliance Check',
      status: 'pending',
      notes: 'Will be executed after manager review',
    },
    {
      id: '4',
      label: 'Final Escalation',
      status: 'pending',
      notes: 'High-risk decisions require escalation',
    },
  ];

  const displaySteps = steps || defaultSteps;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Manager Override Approval Workflow</h3>

      <div className="space-y-4">
        {displaySteps.map((step, index) => {
          const statusConfig = {
            completed: { bg: 'bg-green-50', border: 'border-green-200', circle: 'bg-green-500' },
            current: { bg: 'bg-blue-50', border: 'border-blue-200', circle: 'bg-blue-500' },
            pending: { bg: 'bg-gray-50', border: 'border-gray-200', circle: 'bg-gray-400' },
          };

          const config = statusConfig[step.status];

          return (
            <div key={step.id}>
              <div className={`p-4 rounded-lg border-l-4 ${config.bg} ${config.border} transition-all`}>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full ${config.circle} flex items-center justify-center text-white text-sm font-semibold`}>
                      {step.status === 'completed' ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{step.label}</h4>
                    {step.timestamp && (
                      <p className="text-xs text-gray-600 mt-1">{step.timestamp}</p>
                    )}
                    {step.notes && (
                      <p className="text-sm text-gray-700 mt-2">{step.notes}</p>
                    )}
                  </div>
                </div>
              </div>

              {index < displaySteps.length - 1 && (
                <div className="h-8 border-l-2 border-gray-300 mx-4" />
              )}
            </div>
          );
        })}
      </div>

      {displaySteps.some((s) => s.status === 'current') && (
        <div className="mt-6 pt-6 border-t border-gray-200 flex flex-col gap-3">
          <button
            onClick={onApprove}
            disabled={isLoading}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors text-center"
          >
            {isLoading ? 'Processing...' : 'Approve'}
          </button>
          <button
            onClick={onEscalate}
            disabled={isLoading}
            className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 transition-colors text-center"
          >
            {isLoading ? 'Processing...' : 'Escalate to Compliance'}
          </button>
        </div>
      )}
    </div>
  );
}
