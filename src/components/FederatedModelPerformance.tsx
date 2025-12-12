import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer } from './ChartContainer';

interface TenantMetric {
  tenant: string;
  accuracy: number;
  drift: number;
  samples: number;
}

interface FederatedModelPerformanceProps {
  data?: TenantMetric[];
  isLoading?: boolean;
}

export function FederatedModelPerformance({
  data,
  isLoading = false,
}: FederatedModelPerformanceProps) {
  const defaultData: TenantMetric[] = [
    { tenant: 'Tenant A', accuracy: 87, drift: 2.1, samples: 450 },
    { tenant: 'Tenant B', accuracy: 84, drift: 3.5, samples: 320 },
    { tenant: 'Tenant C', accuracy: 91, drift: 1.2, samples: 580 },
    { tenant: 'Tenant D', accuracy: 79, drift: 5.8, samples: 210 },
    { tenant: 'Tenant E', accuracy: 89, drift: 2.8, samples: 390 },
    { tenant: 'Tenant F', accuracy: 85, drift: 4.1, samples: 275 },
  ];

  const displayData = data || defaultData;

  return (
    <div className="space-y-6">
      <ChartContainer title="Per-Tenant Model Accuracy" isLoading={isLoading}>
        <div className="w-full space-y-4">
          {displayData.map((item) => {
            const driftStatus = item.drift < 2 ? 'text-green-600' : item.drift < 4 ? 'text-yellow-600' : 'text-red-600';

            return (
              <div key={item.tenant}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-900">{item.tenant}</span>
                  <div className="text-right">
                    <span className="font-semibold text-gray-900">{item.accuracy}%</span>
                    <span className={`text-xs ml-2 ${driftStatus}`}>
                      Drift: {item.drift.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${item.accuracy}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </ChartContainer>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Model Drift Detection</h3>
        <div className="grid grid-cols-3 gap-4">
          {displayData.map((item) => (
            <div key={`drift-${item.tenant}`} className="p-4 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600">{item.tenant}</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{item.drift.toFixed(1)}%</p>
              <p className="text-xs text-gray-500 mt-1">{item.samples} samples monitored</p>
              {item.drift > 4 && (
                <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700 font-medium">
                  High drift detected
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
