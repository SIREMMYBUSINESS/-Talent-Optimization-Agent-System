import { useAuditStream } from '../hooks/useAuditStream';
import { formatDateTime } from '../utils/formatters';

export function AuditLogStream() {
  const { events, isConnected, connectionMode, error, reconnect } = useAuditStream({
    maxEvents: 50,
    enableSSE: true,
    enableRealtime: true,
  });

  const getEventTypeColor = (eventType: string) => {
    if (eventType.includes('error')) return 'bg-red-100 text-red-800';
    if (eventType.includes('screen')) return 'bg-blue-100 text-blue-800';
    if (eventType.includes('audit')) return 'bg-purple-100 text-purple-800';
    if (eventType.includes('onboard')) return 'bg-green-100 text-green-800';
    if (eventType.includes('created')) return 'bg-emerald-100 text-emerald-800';
    if (eventType.includes('updated')) return 'bg-amber-100 text-amber-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getConnectionModeLabel = (mode: string) => {
    switch (mode) {
      case 'sse':
        return 'SSE';
      case 'realtime':
        return 'Realtime';
      case 'polling':
        return 'Polling';
      default:
        return 'Disconnected';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Live Audit Stream</h3>
        <div className="flex items-center space-x-3">
          {error && (
            <button
              onClick={reconnect}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Retry
            </button>
          )}
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
            {getConnectionModeLabel(connectionMode)}
          </span>
          <div className="flex items-center space-x-2">
            <div
              className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
            ></div>
            <span className="text-xs text-gray-500">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="px-6 py-2 bg-red-50 border-b border-red-200">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      <div className="max-h-96 overflow-y-auto">
        {events.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            <p>Waiting for audit events...</p>
            <p className="text-xs mt-2 text-gray-400">
              Events will appear here as actions occur in the system
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {events.map((event, idx) => (
              <div key={event.id || idx} className="px-6 py-3 hover:bg-gray-50 text-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${getEventTypeColor(event.event_type)}`}
                      >
                        {event.event_type}
                      </span>
                      {event.user_id && (
                        <span className="text-xs text-gray-500">by {event.user_id}</span>
                      )}
                    </div>
                    {event.payload && Object.keys(event.payload).length > 0 && (
                      <div className="mt-1 text-xs text-gray-600">
                        {JSON.stringify(event.payload).substring(0, 100)}
                        {JSON.stringify(event.payload).length > 100 && '...'}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                    {formatDateTime(event.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
