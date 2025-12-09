import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface AuditEvent {
  id?: string;
  timestamp: string;
  event_type: string;
  action?: string;
  actor?: string;
  user_id?: string;
  payload?: Record<string, any>;
  metadata?: Record<string, any>;
}

type ConnectionMode = 'sse' | 'realtime' | 'polling' | 'disconnected';

interface UseAuditStreamOptions {
  maxEvents?: number;
  pollingInterval?: number;
  enableSSE?: boolean;
  enableRealtime?: boolean;
}

export function useAuditStream(options: UseAuditStreamOptions = {}) {
  const {
    maxEvents = 50,
    pollingInterval = 5000,
    enableSSE = true,
    enableRealtime = true,
  } = options;

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('disconnected');
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const realtimeChannelRef = useRef<any>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const addEvent = useCallback(
    (newEvent: AuditEvent) => {
      setEvents((prev) => [newEvent, ...prev].slice(0, maxEvents));
    },
    [maxEvents]
  );

  const fetchInitialLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, created_at, action, user_id, metadata')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      if (data) {
        const formattedEvents = data.map((log: any) => ({
          id: log.id,
          timestamp: log.created_at,
          event_type: log.action,
          user_id: log.user_id || 'system',
          payload: log.metadata || {},
        }));
        setEvents(formattedEvents);
      }
    } catch (err) {
      console.error('Failed to fetch initial audit logs:', err);
    }
  }, []);

  const connectSSE = useCallback(async () => {
    if (!enableSSE) return false;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        console.warn('No auth token available for SSE connection');
        return false;
      }

      const apiUrl = import.meta.env.VITE_API_URL || '';
      if (!apiUrl) {
        console.warn('VITE_API_URL not configured, skipping SSE');
        return false;
      }

      const url = `${apiUrl}/admin/audit-logs/stream?token=${encodeURIComponent(session.access_token)}`;

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setConnectionMode('sse');
        setError(null);
        reconnectAttempts.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const newEvent: AuditEvent = {
            id: data.id,
            timestamp: data.timestamp || new Date().toISOString(),
            event_type: data.action || data.event_type || 'unknown',
            user_id: data.actor || data.user_id || 'system',
            payload: data.metadata || data.payload || {},
          };
          addEvent(newEvent);
        } catch (err) {
          console.error('Failed to parse SSE event:', err);
        }
      };

      eventSource.onerror = (err) => {
        console.error('SSE connection error:', err);
        eventSource.close();
        eventSourceRef.current = null;
        setIsConnected(false);
        setConnectionMode('disconnected');

        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          setTimeout(() => connectSSE(), delay);
        } else {
          setError('SSE connection failed after multiple attempts');
        }
      };

      return true;
    } catch (err) {
      console.error('Failed to connect SSE:', err);
      return false;
    }
  }, [enableSSE, addEvent]);

  const connectRealtime = useCallback(async () => {
    if (!enableRealtime) return false;

    try {
      if (realtimeChannelRef.current) {
        await supabase.removeChannel(realtimeChannelRef.current);
      }

      const channel = supabase
        .channel('audit_logs_changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'audit_logs',
          },
          (payload: any) => {
            const newEvent: AuditEvent = {
              id: payload.new.id,
              timestamp: payload.new.created_at,
              event_type: payload.new.action,
              user_id: payload.new.user_id || 'system',
              payload: payload.new.metadata || {},
            };
            addEvent(newEvent);
          }
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            setConnectionMode('realtime');
            setError(null);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setIsConnected(false);
            setError('Realtime subscription failed');
          }
        });

      realtimeChannelRef.current = channel;
      return true;
    } catch (err) {
      console.error('Failed to connect realtime:', err);
      return false;
    }
  }, [enableRealtime, addEvent]);

  const startPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    const poll = async () => {
      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('id, created_at, action, user_id, metadata')
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;

        if (data) {
          setEvents((prev) => {
            const existingIds = new Set(prev.map((e) => e.id));
            const newEvents = data
              .filter((log: any) => !existingIds.has(log.id))
              .map((log: any) => ({
                id: log.id,
                timestamp: log.created_at,
                event_type: log.action,
                user_id: log.user_id || 'system',
                payload: log.metadata || {},
              }));

            if (newEvents.length > 0) {
              return [...newEvents, ...prev].slice(0, maxEvents);
            }
            return prev;
          });
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    pollingRef.current = setInterval(poll, pollingInterval);
    setConnectionMode('polling');
    setIsConnected(true);
  }, [pollingInterval, maxEvents]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }

    setIsConnected(false);
    setConnectionMode('disconnected');
  }, []);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      await fetchInitialLogs();

      if (!mounted) return;

      const sseConnected = await connectSSE();

      if (!sseConnected && mounted) {
        const realtimeConnected = await connectRealtime();

        if (!realtimeConnected && mounted) {
          startPolling();
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
      disconnect();
    };
  }, [fetchInitialLogs, connectSSE, connectRealtime, startPolling, disconnect]);

  return {
    events,
    isConnected,
    connectionMode,
    error,
    disconnect,
    reconnect: connectSSE,
  };
}
