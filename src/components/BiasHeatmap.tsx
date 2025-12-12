import { ChartContainer } from './ChartContainer';

interface BiasData {
  attribute: string;
  screeningPositive: number;
  screeningNegative: number;
  disparity: number;
}

interface BiasHeatmapProps {
  data?: BiasData[];
  isLoading?: boolean;
}

export function BiasHeatmap({ data = [], isLoading = false }: BiasHeatmapProps) {
  const defaultData: BiasData[] = [
    { attribute: 'Gender', screeningPositive: 68, screeningNegative: 32, disparity: 2.1 },
    { attribute: 'Age Group', screeningPositive: 65, screeningNegative: 35, disparity: 1.9 },
    { attribute: 'Ethnicity', screeningPositive: 62, screeningNegative: 38, disparity: 1.6 },
    { attribute: 'Location', screeningPositive: 70, screeningNegative: 30, disparity: 2.3 },
    { attribute: 'Experience', screeningPositive: 75, screeningNegative: 25, disparity: 3.0 },
  ];

  const displayData = data.length > 0 ? data : defaultData;
  const maxDisparity = Math.max(...displayData.map((d) => d.disparity));

  return (
    <ChartContainer title="Bias Heatmap: Protected Attributes vs Screening Outcome" isLoading={isLoading}>
      <div className="w-full space-y-4">
        {displayData.map((item) => {
          const disparityIntensity = (item.disparity / maxDisparity) * 100;
          const color = disparityIntensity > 50 ? 'bg-red-500' : disparityIntensity > 25 ? 'bg-yellow-500' : 'bg-green-500';

          return (
            <div key={item.attribute}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-900">{item.attribute}</span>
                <span className={`text-xs font-semibold px-2 py-1 rounded text-white ${color}`}>
                  {item.disparity.toFixed(2)}x
                </span>
              </div>
              <div className="flex gap-2 h-8 rounded overflow-hidden">
                <div
                  className="bg-blue-500 flex items-center justify-center text-white text-xs font-medium"
                  style={{ width: `${item.screeningPositive}%` }}
                >
                  {item.screeningPositive > 10 && `${item.screeningPositive}%`}
                </div>
                <div
                  className="bg-gray-300 flex items-center justify-center text-gray-700 text-xs font-medium"
                  style={{ width: `${item.screeningNegative}%` }}
                >
                  {item.screeningNegative > 10 && `${item.screeningNegative}%`}
                </div>
              </div>
            </div>
          );
        })}
        <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-600 space-y-1">
          <p>Blue = Positive Screening | Gray = Negative Screening</p>
          <p>Disparity Ratio: Highlighted color indicates bias severity (Red = High, Yellow = Medium, Green = Low)</p>
        </div>
      </div>
    </ChartContainer>
  );
}
