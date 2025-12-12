import { useState } from 'react';
import { DataTable } from './DataTable';
import { ExportButton } from './ExportButton';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  eventType: string;
  userId: string;
  payload: Record<string, any>;
  createdAt: string;
}

interface AuditLogViewerProps {
  data?: AuditLog[];
  isLoading?: boolean;
  onSearch?: (term: string) => void;
}

export function AuditLogViewer({
  data = [],
  isLoading = false,
  onSearch,
}: AuditLogViewerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const defaultData: AuditLog[] = [
    {
      id: '1',
      eventType: 'SCREENING_COMPLETED',
      userId: 'user-123',
      payload: { candidate: 'John Doe', score: 85 },
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      eventType: 'OVERRIDE_DECISION',
      userId: 'user-456',
      payload: { originalDecision: 'Rejected', newDecision: 'Interview' },
      createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      eventType: 'COMPLIANCE_FLAG',
      userId: 'system',
      payload: { flagType: 'GDPR', severity: 'high' },
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const displayData = data.length > 0 ? data : defaultData;
  const filteredData = displayData.filter(
    (log) =>
      log.eventType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    onSearch?.(term);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Audit Logs</h3>
          <ExportButton data={filteredData} filename="audit-logs" />
        </div>

        <input
          type="text"
          placeholder="Search by event type or user..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <DataTable<AuditLog>
          columns={[
            {
              key: 'eventType',
              label: 'Event Type',
              width: '20%',
              render: (value) => (
                <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  {value}
                </span>
              ),
            },
            {
              key: 'userId',
              label: 'User',
              width: '15%',
              render: (value) => <span className="text-sm text-gray-700">{value}</span>,
            },
            {
              key: 'payload',
              label: 'Details',
              width: '40%',
              render: (value) => (
                <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700 max-w-xs truncate inline-block">
                  {JSON.stringify(value).substring(0, 50)}...
                </code>
              ),
            },
            {
              key: 'createdAt',
              label: 'Timestamp',
              width: '25%',
              render: (value) => (
                <span className="text-sm text-gray-600">
                  {format(new Date(value), 'MMM d, yyyy h:mm a')}
                </span>
              ),
            },
          ]}
          data={filteredData}
          isLoading={isLoading}
          emptyMessage="No audit logs found"
          keyExtractor={(row) => row.id}
        />
      </div>

      {selectedLog && (
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Log Details</h4>
          <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-x-auto">
            {JSON.stringify(selectedLog, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
