import { ChartContainer } from './ChartContainer';

interface ScoringComponent {
  name: string;
  weight: number;
  score: number;
}

interface PredictiveHiringScoreProps {
  overallScore?: number;
  components?: ScoringComponent[];
  successProbability?: number;
  isLoading?: boolean;
}

export function PredictiveHiringScore({
  overallScore = 82,
  components,
  successProbability = 0.78,
  isLoading = false,
}: PredictiveHiringScoreProps) {
  const defaultComponents: ScoringComponent[] = [
    { name: 'Resume Match', weight: 0.25, score: 88 },
    { name: 'Screening Score', weight: 0.25, score: 82 },
    { name: 'Interview Performance', weight: 0.3, score: 79 },
    { name: 'Culture Fit', weight: 0.2, score: 80 },
  ];

  const displayComponents = components || defaultComponents;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-50 border-green-200';
    if (score >= 60) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <ChartContainer title="Predictive Hiring Success Score" isLoading={isLoading}>
      <div className="space-y-6">
        <div className="text-center">
          <div className={`inline-flex items-center justify-center h-40 w-40 rounded-full border-8 ${getScoreBgColor(overallScore)} transition-all`}>
            <div className="text-center">
              <div className={`text-5xl font-bold ${getScoreColor(overallScore)}`}>
                {overallScore}
              </div>
              <div className="text-sm text-gray-600 mt-1">Composite Score</div>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-gray-700 font-medium">
              Success Probability: <span className="text-lg font-bold text-blue-600">{(successProbability * 100).toFixed(0)}%</span>
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Likelihood of strong job performance in 12 months
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-6 border-t border-gray-200">
          {displayComponents.map((component) => {
            const contribution = (component.weight * component.score).toFixed(1);

            return (
              <div key={component.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">{component.name}</span>
                  <div className="text-right">
                    <span className={`font-semibold ${getScoreColor(component.score)}`}>
                      {component.score}
                    </span>
                    <span className="text-xs text-gray-600 ml-2">({(component.weight * 100).toFixed(0)}%)</span>
                  </div>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      component.score >= 80
                        ? 'bg-green-500'
                        : component.score >= 60
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }`}
                    style={{ width: `${component.score}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-600">
            This score combines resume screening, interview performance, and cultural fit assessments to predict
            long-term hiring success. Higher scores indicate greater likelihood of positive outcomes.
          </p>
        </div>
      </div>
    </ChartContainer>
  );
}
