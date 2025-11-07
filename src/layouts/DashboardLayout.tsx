import { ReactNode, useMemo } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface Tab {
  id: string;
  label: string;
  path: string;
  roles: string[];
}

export function DashboardLayout() {
  const { user, userRole, signOut } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const allTabs: Tab[] = [
    { id: 'overview', label: 'Overview', path: '/dashboard/overview', roles: ['admin', 'recruiter', 'compliance', 'viewer'] },
    { id: 'candidates', label: 'Candidates', path: '/dashboard/candidates', roles: ['admin', 'recruiter'] },
    { id: 'jobs', label: 'Jobs', path: '/dashboard/jobs', roles: ['admin', 'recruiter'] },
    { id: 'screening', label: 'Screening', path: '/dashboard/screening', roles: ['admin', 'recruiter'] },
    { id: 'compliance', label: 'Compliance', path: '/dashboard/compliance', roles: ['admin', 'compliance'] },
  ];

  const visibleTabs = useMemo(() => {
    return allTabs.filter(tab => tab.roles.includes(userRole));
  }, [userRole, allTabs]);

  const isActiveTab = (path: string) => {
    return location.pathname === path;
  };

  const handleTabClick = (path: string) => {
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Talent Optimization Dashboard</h1>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <nav className="flex space-x-4 overflow-x-auto" aria-label="Tabs">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.path)}
                className={`px-3 py-2 font-medium text-sm rounded-md whitespace-nowrap transition-colors ${
                  isActiveTab(tab.path)
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <Outlet />
      </div>
    </div>
  );
}
