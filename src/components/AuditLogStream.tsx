import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatDateTime } from '../utils/formatters';

interface AuditEvent {
  id?: string;
  timestamp: string;
  event_type: string;
  action?: string;
  actor?: string;
  user_id?: string;
  payload?: Record<string, any>;
  metadata?: Record<string, any>;
}

export function AuditLogStream() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let mounted = true;
    let eventSource: EventSource | null = null;

    const connectToStream = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          console.error('No auth token available for SSE connection');
          return;
        }

        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const url = `${apiUrl}/admin/audit-logs/stream`;

        eventSource = new EventSource(url);

        eventSource.onopen = () => {
          if (mounted) {
            setIsConnected(true);
          }
        };

        eventSource.onmessage = (event) => {
          if (mounted) {
            try {
              const data = JSON.parse(event.data);
              const newEvent: AuditEvent = {
                id: data.id,
                timestamp: data.timestamp || new Date().toISOString(),
                event_type: data.action || data.event_type || 'unknown',
                user_id: data.actor || data.user_id || 'system',
                payload: data.metadata || data.payload || {},
              };
              setEvents((prev) => [newEvent, ...prev].slice(0, 50));
            } catch (error) {
              console.error('Failed to parse SSE event:', error);
            }
          }
        };

        eventSource.onerror = (error) => {
          console.error('SSE connection error:', error);
          if (mounted) {
            setIsConnected(false);
          }
          eventSource?.close();
        };
      } catch (error) {
        console.error('Failed to connect to audit stream:', error);
      }
    };

    connectToStream();

    return () => {
      mounted = false;
      eventSource?.close();
    };
  }, []);

  const getEventTypeColor = (eventType: string) => {
    if (eventType.includes('error')) return 'bg-red-100 text-red-800';
    if (eventType.includes('screen')) return 'bg-blue-100 text-blue-800';
    if (eventType.includes('audit')) return 'bg-purple-100 text-purple-800';
    if (eventType.includes('onboard')) return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Live Audit Stream</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-xs text-gray-500">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {events.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            <p>Waiting for audit events...</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {events.map((event, idx) => (
              <div key={idx} className="px-6 py-3 hover:bg-gray-50 text-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getEventTypeColor(event.event_type)}`}>
                        {event.event_type}
                      </span>
                      {event.user_id && (
                        <span className="text-xs text-gray-500">by {event.user_id}</span>
                      )}
                    </div>
                    {event.payload && Object.keys(event.payload).length > 0 && (
                      <div className="mt-1 text-xs text-gray-600">
                        {JSON.stringify(event.payload).substring(0, 100)}
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
