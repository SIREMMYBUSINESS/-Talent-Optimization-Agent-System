import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer } from './ChartContainer';

interface SentimentData {
  category: string;
  positive: number;
  neutral: number;
  negative: number;
}

interface SentimentAnalysisProps {
  data?: SentimentData[];
  isLoading?: boolean;
}

export function SentimentAnalysis({ data, isLoading = false }: SentimentAnalysisProps) {
  const defaultData: SentimentData[] = [
    { category: 'Resume Tone', positive: 72, neutral: 20, negative: 8 },
    { category: 'Interview Feedback', positive: 65, neutral: 25, negative: 10 },
    { category: 'Communication', positive: 78, neutral: 15, negative: 7 },
    { category: 'Cultural Fit', positive: 68, neutral: 22, negative: 10 },
  ];

  const displayData = data || defaultData;

  return (
    <ChartContainer title="Sentiment Analysis: Resume & Interview Feedback" isLoading={isLoading}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={displayData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="category" />
          <YAxis domain={[0, 100]} />
          <Tooltip formatter={(value) => `${value}%`} />
          <Legend />
          <Bar dataKey="positive" stackId="sentiment" fill="#10b981" name="Positive" />
          <Bar dataKey="neutral" stackId="sentiment" fill="#9ca3af" name="Neutral" />
          <Bar dataKey="negative" stackId="sentiment" fill="#ef4444" name="Negative" />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
