import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import { getBiasInsights } from "../services/api";
import { BiasInsights } from "../types/bias";  // <-- import shared type
import Modal from "../components/Modal";
export default function BiasInsightsPanel() {
  const [insights, setInsights] = useState<BiasInsights | null>(null);

  useEffect(() => {
    getBiasInsights()
      .then((data) => setInsights(data))
      .catch((err) => console.error("Failed to load bias insights:", err));
  }, []);

  if (!insights) return <div>Loading...</div>;

  return (
    <div className="bias-insights-panel">
      <h3>Bias Insights</h3>
      <p>% resumes flagged: {insights.flagged_percentage}%</p>
      <ul>
        {insights.top_terms.map((term) => (
          <li key={term.term}>
            {term.term} ({term.count})
          </li>
        ))}
      </ul>
      <Line
        data={{
          labels: insights.trend.map((t) => t.date),
          datasets: [
            { label: "Bias Flags", data: insights.trend.map((t) => t.count) },
          ],
        }}
      />
      <button onClick={() => window.location.href = "/compliance-dashboard"}>
        View flagged resumes
      </button>
    </div>
  );
}
