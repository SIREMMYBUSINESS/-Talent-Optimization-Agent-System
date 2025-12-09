import { useState } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { CandidatesTable } from '../components/CandidatesTable';
import { ApplicationsTable } from '../components/ApplicationsTable';
import { JobPostingsTable } from '../components/JobPostingsTable';
import { AuditLogStream } from '../components/AuditLogStream';

type TabType = 'applications' | 'candidates' | 'jobs' | 'audit';

export function TalentWorkflows() {
  const [activeTab, setActiveTab] = useState<TabType>('applications');

  const tabs = [
    { id: 'applications' as TabType, name: 'Applications', icon: '📋' },
    { id: 'candidates' as TabType, name: 'Candidates', icon: '👤' },
    { id: 'jobs' as TabType, name: 'Job Postings', icon: '💼' },
    { id: 'audit' as TabType, name: 'Audit Logs', icon: '📊' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Talent Workflows</h1>
          </div>

          <nav className="flex space-x-8 mt-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm
                  ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="py-6">
          {activeTab === 'applications' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Application Management
                </h2>
              </div>
              <ApplicationsTable />
            </div>
          )}

          {activeTab === 'candidates' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Candidate Database</h2>
              </div>
              <CandidatesTable />
            </div>
          )}

          {activeTab === 'jobs' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Job Postings</h2>
              </div>
              <JobPostingsTable />
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Live Audit Stream</h2>
              </div>
              <AuditLogStream />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
