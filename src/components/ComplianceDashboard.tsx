import React, { useEffect, useState } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  getAuditLogs,
  updateAuditLog,
  subscribeAuditStream,
  getBiasInsights,
} from "../services/api";
import { AuditLog, BiasInsights } from "../types/bias";

export default function ComplianceDashboard() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [insights, setInsights] = useState<BiasInsights | null>(null);

  useEffect(() => {
    // Load initial audit logs
    getAuditLogs()
      .then((data) => setLogs(data))
      .catch((err) => console.error("Failed to fetch audit logs:", err));

    // Load bias insights
    getBiasInsights()
      .then((data) => setInsights(data))
      .catch((err) => console.error("Failed to fetch bias insights:", err));

    // Subscribe to SSE audit stream
    const eventSource = subscribeAuditStream((event) => {
      setLogs((prev) => [event, ...prev]);
    });

    return () => eventSource.close();
  }, []);

  const handleAction = (id: string, status: "resolved" | "escalated") => {
    updateAuditLog(id, status)
      .then(() => {
        setLogs((prev) =>
          prev.map((log) => (log.id === id ? { ...log, status } : log))
        );
      })
      .catch((err) => console.error("Failed to update audit log:", err));
  };

  return (
    <div className="compliance-dashboard">
      <h2>Compliance Dashboard</h2>

      <section>
        <h3>Real-Time Audit Stream</h3>
        <ul>
          {logs.map((log) => (
            <li key={log.id}>
              Candidate {log.candidate_id} | Terms:{" "}
              {JSON.stringify(log.flagged_terms)} | Severity: {log.severity} |
              Status: {log.status}
              <button onClick={() => handleAction(log.id, "resolved")}>
                Resolve
              </button>
              <button onClick={() => handleAction(log.id, "escalated")}>
                Escalate
              </button>
            </li>
          ))}
        </ul>
      </section>

      {insights && (
        <section>
          <h3>Charts & KPIs</h3>
          <Bar
            data={{
              labels: insights.top_terms.map((t) => t.term),
              datasets: [
                {
                  label: "Bias Term Frequency",
                  data: insights.top_terms.map((t) => t.count),
                },
              ],
            }}
          />
          <Doughnut
            data={{
              labels: ["Low", "Medium", "High"],
              datasets: [
                {
                  data: [10, 20, 5], // Replace with real severity counts later
                  backgroundColor: ["#4caf50", "#ff9800", "#f44336"],
                },
              ],
            }}
          />
        </section>
      )}
    </div>
  );
}
