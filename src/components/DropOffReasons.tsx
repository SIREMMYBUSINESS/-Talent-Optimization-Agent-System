import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer } from './ChartContainer';

interface DropoffReason {
  name: string;
  value: number;
}

interface DropOffReasonsProps {
  data?: DropoffReason[];
  isLoading?: boolean;
}

export function DropOffReasons({ data, isLoading = false }: DropOffReasonsProps) {
  const defaultData: DropoffReason[] = [
    { name: 'Resume to Screening', value: 160 },
    { name: 'Screening to Interview', value: 160 },
    { name: 'Interview to Offer', value: 108 },
    { name: 'Offer to Hire', value: 44 },
  ];

  const displayData = data || defaultData;
  const colors = ['#ef4444', '#f97316', '#eab308', '#ef4444'];

  return (
    <ChartContainer title="Candidate Drop-off at Each Stage" isLoading={isLoading}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={displayData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name}: ${value}`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {colors.map((color, index) => (
              <Cell key={`cell-${index}`} fill={color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `${value} candidates`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
