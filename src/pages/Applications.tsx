import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { ApplicationsTable } from '../components/ApplicationsTable';

export function Applications() {
  const [searchParams] = useSearchParams();
  const filter = searchParams.get('filter');

  const isFlaggedView = filter === 'flagged';
  const isOverridesView = filter === 'overrides';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            {isFlaggedView ? 'Flagged Resumes' : isOverridesView ? 'Manager Overrides' : 'Applications'}
          </h1>
          {isFlaggedView && (
            <div className="text-sm text-gray-600">
              Reviewing candidates with compliance flags
            </div>
          )}
          {isOverridesView && (
            <div className="text-sm text-gray-600">
              Manager escalations and decision overrides
            </div>
          )}
        </div>

        <ApplicationsTable
          flaggedOnly={isFlaggedView}
          statusFilter={isOverridesView ? 'interview' : undefined}
        />
      </div>
    </DashboardLayout>
  );
}
