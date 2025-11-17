import { Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";

import { useAuthStore } from "./store/authStore";
import { queryClient } from "./lib/queryClient";

// pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import JobDetails from "./pages/JobDetails";
import BiasInsightsPanel from "./components/BiasInsightsPanel";
import ComplianceDashboard from "./components/ComplianceDashboard";

// auth wrapper
import ProtectedRoute from "./components/ProtectedRoute";

export function App() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <QueryClientProvider client={queryClient}>
      <Routes>
        {/* Auth */}
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Dashboard — any logged-in user */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Recruiter / HR / Admin */}
        <Route
          path="/jobs/:jobId"
          element={
            <ProtectedRoute roles={["recruiter", "hr_manager", "admin"]}>
              <JobDetails />
            </ProtectedRoute>
          }
        />

        {/* Compliance */}
        <Route
          path="/compliance-dashboard"
          element={
            <ProtectedRoute roles={["compliance", "admin"]}>
              <ComplianceDashboard />
            </ProtectedRoute>
          }
        />

        {/* Optional module */}
        <Route
          path="/bias-insights"
          element={
            <ProtectedRoute roles={["admin", "compliance"]}>
              <BiasInsightsPanel />
            </ProtectedRoute>
          }
        />
      </Routes>
    </QueryClientProvider>
  );
}
