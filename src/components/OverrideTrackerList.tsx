import { DataTable } from './DataTable';
import { StatusBadge } from './StatusBadge';
import { format } from 'date-fns';

interface Override {
  id: string;
  candidateName: string;
  jobTitle: string;
  originalDecision: string;
  overriddenDecision: string;
  managerName: string;
  notes?: string;
  createdAt: string;
  escalationStatus: 'pending' | 'reviewed' | 'escalated';
}

interface OverrideTrackerListProps {
  data?: Override[];
  isLoading?: boolean;
  emptyMessage?: string;
}

export function OverrideTrackerList({
  data = [],
  isLoading = false,
  emptyMessage = 'No override decisions recorded',
}: OverrideTrackerListProps) {
  const defaultData: Override[] = [
    {
      id: '1',
      candidateName: 'Sarah Johnson',
      jobTitle: 'Senior Developer',
      originalDecision: 'Rejected',
      overriddenDecision: 'Interview',
      managerName: 'John Smith',
      notes: 'Strong portfolio despite lower score',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      escalationStatus: 'reviewed',
    },
    {
      id: '2',
      candidateName: 'Michael Chen',
      jobTitle: 'Product Manager',
      originalDecision: 'Interview',
      overriddenDecision: 'Rejected',
      managerName: 'Emily Davis',
      notes: 'Availability concerns raised',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      escalationStatus: 'escalated',
    },
  ];

  const displayData = data.length > 0 ? data : defaultData;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Manual Override Decisions</h3>
      </div>
      <DataTable<Override>
        columns={[
          {
            key: 'candidateName',
            label: 'Candidate',
            width: '15%',
          },
          {
            key: 'jobTitle',
            label: 'Position',
            width: '15%',
          },
          {
            key: 'originalDecision',
            label: 'Original Decision',
            width: '12%',
            render: (value) => (
              <span className={`text-xs font-medium ${
                value === 'Rejected' ? 'text-red-600' : 'text-green-600'
              }`}>
                {value}
              </span>
            ),
          },
          {
            key: 'overriddenDecision',
            label: 'Overridden Decision',
            width: '12%',
            render: (value) => (
              <span className={`text-xs font-medium ${
                value === 'Rejected' ? 'text-red-600' : 'text-green-600'
              }`}>
                {value}
              </span>
            ),
          },
          {
            key: 'managerName',
            label: 'Manager',
            width: '12%',
          },
          {
            key: 'notes',
            label: 'Notes',
            width: '20%',
            render: (value) => (
              <span className="text-xs text-gray-600 truncate max-w-xs">
                {value || '-'}
              </span>
            ),
          },
          {
            key: 'escalationStatus',
            label: 'Status',
            width: '14%',
            render: (value) => <StatusBadge status={value} size="sm" />,
          },
        ]}
        data={displayData}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
        keyExtractor={(row) => row.id}
      />
    </div>
  );
}
