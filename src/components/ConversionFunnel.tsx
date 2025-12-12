import { ChartContainer } from './ChartContainer';

interface FunnelStage {
  stage: string;
  value: number;
  percentage: number;
}

interface ConversionFunnelProps {
  data?: FunnelStage[];
  isLoading?: boolean;
}

export function ConversionFunnel({ data, isLoading = false }: ConversionFunnelProps) {
  const defaultData: FunnelStage[] = [
    { stage: 'Resume', value: 500, percentage: 100 },
    { stage: 'Screening', value: 340, percentage: 68 },
    { stage: 'Interview', value: 180, percentage: 36 },
    { stage: 'Offer', value: 72, percentage: 14.4 },
    { stage: 'Hire', value: 28, percentage: 5.6 },
  ];

  const displayData = data || defaultData;
  const maxValue = Math.max(...displayData.map((d) => d.value));

  return (
    <ChartContainer title="Conversion Funnel: Resume to Hire" isLoading={isLoading}>
      <div className="w-full space-y-3">
        {displayData.map((item, index) => {
          const width = (item.value / maxValue) * 100;
          const dropoff = index > 0 ? displayData[index - 1].value - item.value : 0;
          const dropoffPercent = index > 0 ? ((dropoff / displayData[index - 1].value) * 100).toFixed(1) : '0';

          return (
            <div key={item.stage}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-gray-900">{item.stage}</span>
                <div className="text-right">
                  <span className="font-semibold text-gray-900">{item.value}</span>
                  {index > 0 && (
                    <span className="text-xs text-red-600 ml-2">
                      ({dropoffPercent}% drop)
                    </span>
                  )}
                </div>
              </div>
              <div className="relative h-10 bg-gray-100 rounded-lg overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-end pr-3 transition-all"
                  style={{ width: `${width}%` }}
                >
                  {width > 20 && (
                    <span className="text-white text-sm font-medium">
                      {item.percentage.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ChartContainer>
  );
}
