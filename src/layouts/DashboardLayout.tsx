import { ReactNode } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

interface DashboardLayoutProps {
  children?: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, signOut, userRole } = useAuthStore();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  // Tabs with role-based visibility
  const tabs = [
    { id: "overview", label: "Overview", roles: ["admin", "viewer", "hr_manager", "recruiter", "compliance"] },
    { id: "candidates", label: "Candidates", roles: ["admin", "hr_manager", "recruiter"] },
    { id: "jobs", label: "Jobs", roles: ["admin", "hr_manager", "recruiter"] },
    { id: "screening", label: "Screening", roles: ["admin", "hr_manager", "recruiter"] },
    { id: "compliance", label: "Compliance", roles: ["admin", "compliance"] },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                Talent Optimization Dashboard
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-700">
                {user?.email || user?.phone}
              </div>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <nav className="flex space-x-4 overflow-x-auto" aria-label="Tabs">
            {tabs
              .filter((tab) => tab.roles.includes(userRole))
              .map((tab) => (
                <NavLink
                  key={tab.id}
                  to={`/dashboard/${tab.id}`}
                  className={({ isActive }) =>
                    `px-3 py-2 font-medium text-sm rounded-md whitespace-nowrap transition-colors ${
                      isActive
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                    }`
                  }
                >
                  {tab.label}
                </NavLink>
              ))}
          </nav>
        </div>

        {/* Nested routes render here */}
        <Outlet />

        {/* Optional children for extra content */}
        {children}
      </div>
    </div>
  );
}
