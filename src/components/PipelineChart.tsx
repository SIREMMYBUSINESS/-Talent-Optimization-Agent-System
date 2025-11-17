import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Modal from "../components/Modal";
interface PipelineChartProps {
  data: Array<{
    stage: string;
    count: number;
    percentage: number;
  }>;
}

export function PipelineChart({ data }: PipelineChartProps) {
  const formattedData = data.map(item => ({
    name: item.stage.replace(/_/g, ' ').toUpperCase(),
    count: item.count,
    percentage: item.percentage.toFixed(1),
  }));

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Candidate Pipeline</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
