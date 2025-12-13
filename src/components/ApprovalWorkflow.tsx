import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface WorkflowStep {
  id: string;
  label: string;
  status: 'pending' | 'completed' | 'current';
  timestamp?: string;
  notes?: string;
}

interface ApprovalWorkflowProps {
  steps?: WorkflowStep[];
  screeningResultId?: string;
  originalRecommendation?: string;
  onApprove?: () => void;
  onEscalate?: () => void;
  isLoading?: boolean;
}

type ModalType = 'approve' | 'escalate' | null;

export function ApprovalWorkflow({
  steps,
  screeningResultId,
  originalRecommendation = 'potential_match',
  onApprove,
  onEscalate,
  isLoading = false,
}: ApprovalWorkflowProps) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [approveReason, setApproveReason] = useState('');
  const [escalateReason, setEscalateReason] = useState('');
  const [escalatePriority, setEscalatePriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

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

  const handleApproveSubmit = async () => {
    if (!approveReason.trim()) {
      setSubmitError('Please provide a reason for approval');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (screeningResultId && user) {
        const { error } = await supabase.from('manager_overrides').insert({
          screening_result_id: screeningResultId,
          manager_id: user.id,
          original_recommendation: originalRecommendation,
          override_recommendation: 'approved',
          override_reason: approveReason,
          escalation_required: false,
          compliance_audit_triggered: true,
        });

        if (error) throw error;
      }

      await supabase.from('audit_logs').insert({
        action: 'manager_approval',
        resource_type: 'screening_result',
        resource_id: screeningResultId || null,
        metadata: {
          reason: approveReason,
          decision: 'approved',
          original_recommendation: originalRecommendation,
        },
      });

      setSubmitSuccess('Decision approved successfully. The candidate will move forward in the process.');
      setApproveReason('');
      onApprove?.();

      setTimeout(() => {
        setActiveModal(null);
        setSubmitSuccess(null);
      }, 2000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit approval');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEscalateSubmit = async () => {
    if (!escalateReason.trim()) {
      setSubmitError('Please provide a reason for escalation');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (screeningResultId && user) {
        const { error } = await supabase.from('manager_overrides').insert({
          screening_result_id: screeningResultId,
          manager_id: user.id,
          original_recommendation: originalRecommendation,
          override_recommendation: 'escalated',
          override_reason: escalateReason,
          escalation_reason: escalateReason,
          escalation_required: true,
          compliance_audit_triggered: true,
        });

        if (error) throw error;
      }

      await supabase.from('audit_logs').insert({
        action: 'manager_escalation',
        resource_type: 'screening_result',
        resource_id: screeningResultId || null,
        metadata: {
          reason: escalateReason,
          priority: escalatePriority,
          decision: 'escalated_to_compliance',
          original_recommendation: originalRecommendation,
        },
      });

      setSubmitSuccess('Escalated to compliance team. They will review within 24 hours.');
      setEscalateReason('');
      onEscalate?.();

      setTimeout(() => {
        setActiveModal(null);
        setSubmitSuccess(null);
      }, 2000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit escalation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setSubmitError(null);
    setSubmitSuccess(null);
    setApproveReason('');
    setEscalateReason('');
  };

  return (
    <>
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
              onClick={() => setActiveModal('approve')}
              disabled={isLoading}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors text-center"
            >
              {isLoading ? 'Processing...' : 'Approve'}
            </button>
            <button
              onClick={() => setActiveModal('escalate')}
              disabled={isLoading}
              className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 transition-colors text-center"
            >
              {isLoading ? 'Processing...' : 'Escalate to Compliance'}
            </button>
          </div>
        )}
      </div>

      {activeModal === 'approve' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Approve Decision</h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 transition-colors text-2xl leading-none"
              >
                x
              </button>
            </div>

            <div className="p-6">
              {submitSuccess ? (
                <div className="flex flex-col items-center py-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-green-700 font-medium text-center">{submitSuccess}</p>
                </div>
              ) : (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-green-800 mb-2">Approval Action</h3>
                    <p className="text-sm text-green-700">
                      By approving, you confirm the screening decision despite any bias flags.
                      The candidate will move forward in the hiring process.
                    </p>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Approval <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={approveReason}
                      onChange={(e) => setApproveReason(e.target.value)}
                      placeholder="Explain why you are approving this decision despite the flagged concerns..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                      rows={4}
                    />
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                    <p className="text-xs text-amber-800">
                      <span className="font-semibold">Note:</span> This action will be logged for compliance auditing.
                      A compliance check will be automatically triggered.
                    </p>
                  </div>

                  {submitError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-red-700">{submitError}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {!submitSuccess && (
              <div className="border-t border-gray-200 px-6 py-4 flex gap-3 justify-end bg-gray-50">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApproveSubmit}
                  disabled={isSubmitting || !approveReason.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Submitting...' : 'Confirm Approval'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeModal === 'escalate' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Escalate to Compliance</h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 transition-colors text-2xl leading-none"
              >
                x
              </button>
            </div>

            <div className="p-6">
              {submitSuccess ? (
                <div className="flex flex-col items-center py-6">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <p className="text-orange-700 font-medium text-center">{submitSuccess}</p>
                </div>
              ) : (
                <>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-orange-800 mb-2">Escalation Action</h3>
                    <p className="text-sm text-orange-700">
                      Escalating defers this decision to compliance officers for deeper review.
                      Use this when bias or risk concerns are significant.
                    </p>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority Level
                    </label>
                    <div className="flex gap-2">
                      {(['low', 'medium', 'high'] as const).map((priority) => (
                        <button
                          key={priority}
                          onClick={() => setEscalatePriority(priority)}
                          className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                            escalatePriority === priority
                              ? priority === 'high'
                                ? 'bg-red-100 border-red-300 text-red-800'
                                : priority === 'medium'
                                ? 'bg-amber-100 border-amber-300 text-amber-800'
                                : 'bg-blue-100 border-blue-300 text-blue-800'
                              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {priority.charAt(0).toUpperCase() + priority.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Escalation <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={escalateReason}
                      onChange={(e) => setEscalateReason(e.target.value)}
                      placeholder="Describe the bias or risk concerns that require compliance review..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                      rows={4}
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-xs text-blue-800">
                      <span className="font-semibold">What happens next:</span> The compliance team will review this case
                      and provide a decision within 24-48 hours depending on priority.
                    </p>
                  </div>

                  {submitError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-red-700">{submitError}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {!submitSuccess && (
              <div className="border-t border-gray-200 px-6 py-4 flex gap-3 justify-end bg-gray-50">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEscalateSubmit}
                  disabled={isSubmitting || !escalateReason.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Escalation'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
