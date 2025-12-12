import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { ChartContainer } from './ChartContainer';

interface CandidateCluster {
  id: string;
  name: string;
  experience: number;
  skillMatch: number;
  cluster: 'excellent' | 'good' | 'fair' | 'poor';
}

interface RoleFitClusteringProps {
  data?: CandidateCluster[];
  isLoading?: boolean;
}

export function RoleFitClustering({ data, isLoading = false }: RoleFitClusteringProps) {
  const defaultData: CandidateCluster[] = [
    { id: '1', name: 'Sarah', experience: 8, skillMatch: 92, cluster: 'excellent' },
    { id: '2', name: 'John', experience: 5, skillMatch: 78, cluster: 'good' },
    { id: '3', name: 'Mike', experience: 3, skillMatch: 65, cluster: 'fair' },
    { id: '4', name: 'Lisa', experience: 10, skillMatch: 88, cluster: 'excellent' },
    { id: '5', name: 'Tom', experience: 2, skillMatch: 45, cluster: 'poor' },
    { id: '6', name: 'Emma', experience: 6, skillMatch: 82, cluster: 'good' },
  ];

  const displayData = data || defaultData;

  const clusterColors = {
    excellent: '#10b981',
    good: '#3b82f6',
    fair: '#f59e0b',
    poor: '#ef4444',
  };

  const chartData = displayData.map((item) => ({
    x: item.experience,
    y: item.skillMatch,
    name: item.name,
    fill: clusterColors[item.cluster],
  }));

  return (
    <ChartContainer title="Role Fit Clustering (Embeddings-based)" isLoading={isLoading}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="x" name="Experience (Years)" domain={[0, 12]} />
          <YAxis dataKey="y" name="Skill Match Score" domain={[0, 100]} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#f3f4f6', border: '1px solid #d1d5db' }} />
          <Scatter name="Candidates" data={chartData} fill="#3b82f6">
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Scatter>
          <Legend />
        </ScatterChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
