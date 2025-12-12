import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { ChartContainer } from './ChartContainer';

interface SkillData {
  skill: string;
  required: number;
  available: number;
  gap: number;
}

interface SkillGapAnalysisProps {
  data?: SkillData[];
  isLoading?: boolean;
}

export function SkillGapAnalysis({ data, isLoading = false }: SkillGapAnalysisProps) {
  const defaultData: SkillData[] = [
    { skill: 'Python', required: 100, available: 65, gap: 35 },
    { skill: 'React', required: 100, available: 72, gap: 28 },
    { skill: 'Node.js', required: 100, available: 58, gap: 42 },
    { skill: 'AWS', required: 100, available: 45, gap: 55 },
    { skill: 'Docker', required: 100, available: 38, gap: 62 },
    { skill: 'DevOps', required: 100, available: 42, gap: 58 },
  ];

  const displayData = data || defaultData;

  const chartData = displayData.map((item) => ({
    skill: item.skill,
    Required: item.required,
    Available: item.available,
  }));

  return (
    <ChartContainer title="Skill Gap Analysis by Role" isLoading={isLoading}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={chartData}>
          <PolarGrid />
          <PolarAngleAxis dataKey="skill" />
          <PolarRadiusAxis angle={90} domain={[0, 100]} />
          <Radar name="Required" dataKey="Required" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} />
          <Radar name="Available" dataKey="Available" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
          <Legend />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
