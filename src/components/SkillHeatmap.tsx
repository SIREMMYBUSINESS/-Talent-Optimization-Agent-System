import { ChartContainer } from './ChartContainer';

interface SkillProficiency {
  skill: string;
  proficiency: number;
}

interface SkillHeatmapProps {
  data?: SkillProficiency[];
  department?: string;
  isLoading?: boolean;
}

export function SkillHeatmap({
  data,
  department = 'Engineering',
  isLoading = false,
}: SkillHeatmapProps) {
  const defaultData: SkillProficiency[] = [
    { skill: 'Python', proficiency: 95 },
    { skill: 'JavaScript', proficiency: 88 },
    { skill: 'React', proficiency: 92 },
    { skill: 'Node.js', proficiency: 85 },
    { skill: 'AWS', proficiency: 72 },
    { skill: 'Docker', proficiency: 68 },
    { skill: 'Kubernetes', proficiency: 55 },
    { skill: 'SQL', proficiency: 90 },
    { skill: 'Git', proficiency: 98 },
    { skill: 'CI/CD', proficiency: 70 },
  ];

  const displayData = data || defaultData;

  const getHeatmapColor = (proficiency: number) => {
    if (proficiency >= 90) return 'bg-green-600';
    if (proficiency >= 75) return 'bg-green-500';
    if (proficiency >= 60) return 'bg-yellow-500';
    if (proficiency >= 45) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <ChartContainer title={`Skill Proficiency Heatmap - ${department}`} isLoading={isLoading}>
      <div className="w-full space-y-2">
        {displayData.map((item) => (
          <div key={item.skill}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-900 w-24">{item.skill}</span>
              <span className="text-sm text-gray-600 ml-2">{item.proficiency}%</span>
            </div>
            <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full flex items-center justify-end pr-2 transition-all ${getHeatmapColor(item.proficiency)}`}
                style={{ width: `${item.proficiency}%` }}
              >
                {item.proficiency > 40 && (
                  <span className="text-white text-xs font-medium">{item.proficiency}%</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ChartContainer>
  );
}
