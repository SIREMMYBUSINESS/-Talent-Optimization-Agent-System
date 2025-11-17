import { Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import Dashboard from "./pages/Dashboard";
import JobDetails from "./pages/JobDetails";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import { useAuthStore } from "./store/authStore";
import { queryClient } from "./lib/queryClient";

// New imports for Bias & Compliance module
import BiasInsightsPanel from "./components/BiasInsightsPanel";
import ComplianceDashboard from "./components/ComplianceDashboard";

export function App() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <QueryClientProvider client={queryClient}>
      <Routes>
        {/* Auth routes */}
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Core app routes */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/jobs/:jobId" element={<JobDetails />} />

        {/* New Bias & Compliance routes */}
        <Route path="/bias-insights" element={<BiasInsightsPanel />} />
        <Route path="/compliance-dashboard" element={<ComplianceDashboard />} />
      </Routes>
    </QueryClientProvider>
  );
}
