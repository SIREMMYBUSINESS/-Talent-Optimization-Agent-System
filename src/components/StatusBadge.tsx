interface StatusBadgeProps {
  status: 'open' | 'reviewed' | 'escalated' | 'resolved' | 'pending' | 'in_progress' | 'completed';
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const baseStyles = 'inline-flex items-center rounded-full font-medium';
  const sizeStyles = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  const statusConfig = {
    open: 'bg-red-100 text-red-800',
    reviewed: 'bg-blue-100 text-blue-800',
    escalated: 'bg-orange-100 text-orange-800',
    resolved: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
  };

  const labelConfig = {
    open: 'Open',
    reviewed: 'Reviewed',
    escalated: 'Escalated',
    resolved: 'Resolved',
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
  };

  return (
    <span className={`${baseStyles} ${sizeStyles} ${statusConfig[status]}`}>
      {labelConfig[status]}
    </span>
  );
}
