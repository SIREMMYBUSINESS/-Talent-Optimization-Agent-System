import { useState, useEffect } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';

interface AuditLog {
  id: string;
  timestamp: string;
  eventType: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  status: 'success' | 'failure' | 'warning';
  ipAddress?: string;
  details?: string;
}

const mockAuditLogs: AuditLog[] = [
  {
    id: '1',
    timestamp: '2025-11-07T10:45:23Z',
    eventType: 'candidate_access',
    userId: 'user-123',
    userName: 'John Recruiter',
    action: 'VIEW',
    resource: 'candidate/sarah-johnson',
    status: 'success',
    ipAddress: '192.168.1.100',
    details: 'Viewed candidate profile',
  },
  {
    id: '2',
    timestamp: '2025-11-07T10:42:15Z',
    eventType: 'screening_completed',
    userId: 'system',
    userName: 'AI Screener',
    action: 'CREATE',
    resource: 'screening/result-456',
    status: 'success',
    details: 'AI screening completed for candidate Michael Chen',
  },
  {
    id: '3',
    timestamp: '2025-11-07T10:38:47Z',
    eventType: 'data_export',
    userId: 'user-456',
    userName: 'Admin User',
    action: 'EXPORT',
    resource: 'candidates/bulk-export',
    status: 'warning',
    ipAddress: '192.168.1.105',
    details: 'Exported 150 candidate records - requires audit review',
  },
  {
    id: '4',
    timestamp: '2025-11-07T10:35:12Z',
    eventType: 'authentication',
    userId: 'user-789',
    userName: 'Jane Compliance',
    action: 'LOGIN',
    resource: 'auth/login',
    status: 'failure',
    ipAddress: '192.168.1.110',
    details: 'Failed login attempt - invalid credentials',
  },
];

function CompliancePage() {
  const [liveEvents, setLiveEvents] = useState<AuditLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [isLoading] = useState(false);

  useEffect(() => {
    const simulateSSEConnection = () => {
      setIsConnected(true);

      const interval = setInterval(() => {
        const newEvent: AuditLog = {
          id: `live-${Date.now()}`,
          timestamp: new Date().toISOString(),
          eventType: ['candidate_access', 'screening_completed', 'data_export', 'authentication'][Math.floor(Math.random() * 4)],
          userId: `user-${Math.floor(Math.random() * 1000)}`,
          userName: ['John Recruiter', 'Jane Compliance', 'Admin User', 'AI Screener'][Math.floor(Math.random() * 4)],
          action: ['VIEW', 'CREATE', 'UPDATE', 'DELETE'][Math.floor(Math.random() * 4)],
          resource: `resource-${Math.floor(Math.random() * 1000)}`,
          status: ['success', 'failure', 'warning'][Math.floor(Math.random() * 3)] as 'success' | 'failure' | 'warning',
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
          details: 'Real-time event captured via SSE',
        };

        setLiveEvents(prev => [newEvent, ...prev].slice(0, 10));
      }, 8000);

      return () => {
        clearInterval(interval);
        setIsConnected(false);
      };
    };

    const cleanup = simulateSSEConnection();
    return cleanup;
  }, []);

  const filteredLogs = mockAuditLogs.filter((log) => {
    const matchesSearch = log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEventType = eventTypeFilter === 'all' || log.eventType === eventTypeFilter;
    return matchesSearch && matchesEventType;
  });

  const getStatusColor = (status: string) => {
    const colors = {
      success: 'bg-green-100 text-green-800',
      failure: 'bg-red-100 text-red-800',
      warning: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'success') {
      return (
        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
    }
    if (status === 'failure') {
      return (
        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Compliance & Audit Logs</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Live Stream Active' : 'Disconnected'}
            </span>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            Export Report
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Real-Time Event Stream</h2>
          <span className="text-sm text-gray-600">{liveEvents.length} recent events</span>
        </div>

        {liveEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Waiting for events...
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {liveEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-md animate-fade-in"
              >
                {getStatusIcon(event.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{event.userName}</span>
                    <span className="text-sm text-gray-600">{event.action}</span>
                    <span className="text-sm text-gray-600">{event.resource}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(event.timestamp).toLocaleTimeString()} • {event.ipAddress}
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(event.status)}`}>
                  {event.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Historical Audit Logs</h2>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by user, action, or resource..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Event Types</option>
            <option value="candidate_access">Candidate Access</option>
            <option value="screening_completed">Screening Completed</option>
            <option value="data_export">Data Export</option>
            <option value="authentication">Authentication</option>
          </select>
        </div>

        {filteredLogs.length === 0 ? (
          <EmptyState message="No audit logs found matching your criteria" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{log.userName}</div>
                      <div className="text-xs text-gray-500">{log.userId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {log.resource}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.ipAddress || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button className="text-blue-600 hover:text-blue-900">View Details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
    </ErrorBoundary>
  );
}

export default CompliancePage;
