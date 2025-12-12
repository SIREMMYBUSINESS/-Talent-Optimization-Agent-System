import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DPComparison, DPMechanismMetrics } from '../types/dashboard';

interface DPComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  comparisonData: DPComparison[];
  mechanismMetrics: DPMechanismMetrics[];
  isLoading?: boolean;
}

export function DPComparisonModal({
  isOpen,
  onClose,
  comparisonData,
  mechanismMetrics,
  isLoading = false,
}: DPComparisonModalProps) {
  const [activeTab, setActiveTab] = useState<'accuracy' | 'mechanism'>('accuracy');

  if (!isOpen) return null;

  const avgOriginalScore =
    comparisonData.length > 0
      ? comparisonData.reduce((sum, d) => sum + d.originalScore, 0) / comparisonData.length
      : 0;
  const avgProtectedScore =
    comparisonData.length > 0
      ? comparisonData.reduce((sum, d) => sum + d.privacyProtectedScore, 0) / comparisonData.length
      : 0;
  const avgDelta = Math.abs(avgOriginalScore - avgProtectedScore);

  const handleExport = () => {
    const data = activeTab === 'accuracy' ? comparisonData : mechanismMetrics;
    const csv = activeTab === 'accuracy' ? exportAccuracyCSV(data as DPComparison[]) : exportMechanismCSV(data as DPMechanismMetrics[]);
    downloadCSV(csv, `dp-${activeTab}-comparison.csv`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-96 overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">DP Model Comparison</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('accuracy')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'accuracy'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Accuracy Comparison
          </button>
          <button
            onClick={() => setActiveTab('mechanism')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'mechanism'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Privacy Mechanism Details
          </button>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : activeTab === 'accuracy' ? (
            <AccuracyComparisonTab
              data={comparisonData}
              avgDelta={avgDelta}
            />
          ) : (
            <MechanismDetailsTab metrics={mechanismMetrics} />
          )}
        </div>

        <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between bg-gray-50">
          <div className="text-sm text-gray-600">
            {activeTab === 'accuracy'
              ? `Comparing ${comparisonData.length} screening results`
              : `${mechanismMetrics.length} mechanisms analyzed`}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="px-4 py-2 text-sm font-medium bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300 transition-colors"
            >
              Export CSV
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccuracyComparisonTab({ data, avgDelta }: { data: DPComparison[]; avgDelta: number }) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No comparison data available</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: d.candidateName.substring(0, 10),
    Original: Math.round(d.originalScore),
    'Privacy-Protected': Math.round(d.privacyProtectedScore),
  }));

  return (
    <div>
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Average Accuracy Delta</p>
            <p className="text-2xl font-bold text-blue-600">{avgDelta.toFixed(1)}%</p>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p>Privacy impact minimal</p>
            <p>Epsilon efficient</p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="Original"
              stroke="#3b82f6"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="Privacy-Protected"
              stroke="#10b981"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">Max Delta</p>
          <p className="text-lg font-bold text-gray-900">
            {Math.max(...data.map((d) => d.accuracyDelta)).toFixed(1)}%
          </p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">Min Delta</p>
          <p className="text-lg font-bold text-gray-900">
            {Math.min(...data.map((d) => d.accuracyDelta)).toFixed(1)}%
          </p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">Samples</p>
          <p className="text-lg font-bold text-gray-900">{data.length}</p>
        </div>
      </div>
    </div>
  );
}

function MechanismDetailsTab({ metrics }: { metrics: DPMechanismMetrics[] }) {
  if (metrics.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No mechanism metrics available</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-gray-600 mb-4">
        Detailed metrics for privacy mechanisms used in DP screening:
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-900">
                Mechanism
              </th>
              <th className="px-4 py-2 text-left font-medium text-gray-900">
                Samples
              </th>
              <th className="px-4 py-2 text-left font-medium text-gray-900">
                Epsilon Budget
              </th>
              <th className="px-4 py-2 text-left font-medium text-gray-900">
                Avg Noise Scale
              </th>
              <th className="px-4 py-2 text-left font-medium text-gray-900">
                CI Width
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {metrics.map((metric) => (
              <tr key={metric.mechanism} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-900 font-medium capitalize">
                  {metric.mechanism}
                </td>
                <td className="px-4 py-2 text-gray-600">{metric.sampleCount}</td>
                <td className="px-4 py-2 text-gray-600">{metric.epsilonBudget}</td>
                <td className="px-4 py-2 text-gray-600">{metric.averageNoiseScale.toFixed(4)}</td>
                <td className="px-4 py-2 text-gray-600">{metric.confidenceIntervalWidth.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs font-semibold text-gray-700 mb-2">Mechanism Descriptions:</p>
        <ul className="space-y-2 text-xs text-gray-600">
          <li>
            <span className="font-medium">Laplace:</span> Adds noise proportional to epsilon. Suitable for
            small datasets.
          </li>
          <li>
            <span className="font-medium">Gaussian:</span> Uses Gaussian noise for better accuracy with
            strict epsilon constraints.
          </li>
        </ul>
      </div>
    </div>
  );
}

function exportAccuracyCSV(data: DPComparison[]): string {
  const headers = ['Candidate', 'Original Score', 'Privacy-Protected Score', 'Accuracy Delta (%)'];
  const rows = data.map((d) => [
    `"${d.candidateName}"`,
    d.originalScore.toFixed(2),
    d.privacyProtectedScore.toFixed(2),
    d.accuracyDelta.toFixed(2),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

function exportMechanismCSV(data: DPMechanismMetrics[]): string {
  const headers = ['Mechanism', 'Sample Count', 'Epsilon Budget', 'Average Noise Scale', 'CI Width'];
  const rows = data.map((m) => [
    m.mechanism,
    m.sampleCount,
    m.epsilonBudget.toFixed(2),
    m.averageNoiseScale.toFixed(4),
    m.confidenceIntervalWidth.toFixed(2),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
