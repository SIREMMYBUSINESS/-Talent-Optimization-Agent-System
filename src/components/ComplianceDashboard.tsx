import React, { useEffect, useState } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import { getAuditLogs, updateAuditLog, subscribeAuditStream } from "../services/api";
interface AuditLog {
  id: string;
  candidate_id: string;
  reviewer_id: string;
  flagged_terms: Record<string, any>;
  severity: "low" | "medium" | "high";
  status: "open" | "resolved" | "escalated";
  created_at: string;
}

interface BiasTerm {
  term: string;
  count: number;
}

interface BiasInsights {
  flagged_percentage: number;
  top_terms: BiasTerm[];
  trend: { date: string; count: number }[];
}

export default function ComplianceDashboard() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [insights, setInsights] = useState<BiasInsights | null>(null);

  useEffect(() => {
    fetch("/api/audit/logs")
      .then(res => res.json())
      .then((data: AuditLog[]) => setLogs(data));

    fetch("/api/bias/insights")
      .then(res => res.json())
      .then((data: BiasInsights) => setInsights(data));

    const eventSource = new EventSource("/api/audit/stream");
    eventSource.onmessage = e => {
      const event: AuditLog = JSON.parse(e.data);
      setLogs(prev => [event, ...prev]);
    };
    return () => eventSource.close();
  }, []);

  const handleAction = (id: string, status: "resolved" | "escalated") => {
    fetch(`/api/audit/logs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    }).then(() => {
      setLogs(prev => prev.map(log => log.id === id ? { ...log, status } : log));
    });
  };

  return (
    <div className="compliance-dashboard">
      <h2>Compliance Dashboard</h2>

      <section>
        <h3>Real-Time Audit Stream</h3>
        <ul>
          {logs.map(log => (
            <li key={log.id}>
              Candidate {log.candidate_id} | Terms: {JSON.stringify(log.flagged_terms)} | Severity: {log.severity} | Status: {log.status}
              <button onClick={() => handleAction(log.id, "resolved")}>Resolve</button>
              <button onClick={() => handleAction(log.id, "escalated")}>Escalate</button>
            </li>
          ))}
        </ul>
      </section>

      {insights && (
        <section>
          <h3>Charts & KPIs</h3>
          <Bar
            data={{
              labels: insights.top_terms.map(t => t.term),
              datasets: [{ label: "Bias Term Frequency", data: insights.top_terms.map(t => t.count) }]
            }}
          />
          <Doughnut
            data={{
              labels: ["Low", "Medium", "High"],
              datasets: [{ data: [10, 20, 5], backgroundColor: ["#4caf50", "#ff9800", "#f44336"] }]
            }}
          />
        </section>
      )}
    </div>
  );
}
