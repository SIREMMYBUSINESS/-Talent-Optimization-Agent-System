import { DataTable } from './DataTable';
import { StatusBadge } from './StatusBadge';
import { format } from 'date-fns';

interface Violation {
  id: string;
  flagType: string;
  severity: 'low' | 'medium' | 'high';
  status: 'open' | 'reviewed' | 'escalated';
  description: string;
  createdAt: string;
}

interface ViolationTrackerProps {
  data?: Violation[];
  isLoading?: boolean;
  emptyMessage?: string;
}

export function ViolationTracker({
  data = [],
  isLoading = false,
  emptyMessage = 'No compliance violations found',
}: ViolationTrackerProps) {
  const defaultData: Violation[] = [
    {
      id: '1',
      flagType: 'GDPR',
      severity: 'high',
      status: 'open',
      description: 'Personal data retention period exceeded',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      flagType: 'EEOC',
      severity: 'medium',
      status: 'reviewed',
      description: 'Age-based screening disparity detected',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      flagType: 'GDPR',
      severity: 'low',
      status: 'escalated',
      description: 'Missing consent documentation',
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const displayData = data.length > 0 ? data : defaultData;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-orange-100 text-orange-800';
      case 'low':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Compliance Violations</h3>
        <p className="text-sm text-gray-600 mt-1">GDPR/EEOC flags and compliance issues</p>
      </div>
      <DataTable<Violation>
        columns={[
          {
            key: 'flagType',
            label: 'Regulation',
            width: '12%',
            render: (value) => (
              <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                {value}
              </span>
            ),
          },
          {
            key: 'severity',
            label: 'Severity',
            width: '10%',
            render: (value) => (
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getSeverityColor(value)}`}>
                {String(value).charAt(0).toUpperCase() + String(value).slice(1)}
              </span>
            ),
          },
          {
            key: 'description',
            label: 'Description',
            width: '40%',
            render: (value) => <span className="text-sm text-gray-700">{value}</span>,
          },
          {
            key: 'status',
            label: 'Status',
            width: '15%',
            render: (value) => <StatusBadge status={value} size="sm" />,
          },
          {
            key: 'createdAt',
            label: 'Detected',
            width: '23%',
            render: (value) => (
              <span className="text-sm text-gray-600">
                {format(new Date(value), 'MMM d, yyyy h:mm a')}
              </span>
            ),
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
