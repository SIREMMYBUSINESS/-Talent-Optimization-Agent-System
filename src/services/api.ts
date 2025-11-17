// src/services/api.ts
import { BiasInsights, AuditLog, Status } from "../types/bias";

// Fetch bias insights
export async function getBiasInsights(): Promise<BiasInsights> {
  const res = await fetch("/api/bias/insights");
  if (!res.ok) throw new Error("Failed to fetch bias insights");
  return res.json();
}

// Fetch audit logs
export async function getAuditLogs(): Promise<AuditLog[]> {
  const res = await fetch("/api/audit/logs");
  if (!res.ok) throw new Error("Failed to fetch audit logs");
  return res.json();
}

// Update audit log status
export async function updateAuditLog(id: string, status: Status): Promise<void> {
  const res = await fetch(`/api/audit/logs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update audit log");
}

// SSE stream for real-time audit events
export function subscribeAuditStream(onEvent: (event: AuditLog) => void): EventSource {
  const eventSource = new EventSource("/api/audit/stream");
  eventSource.onmessage = (e) => {
    const event: AuditLog = JSON.parse(e.data);
    onEvent(event);
  };
  return eventSource;
}
