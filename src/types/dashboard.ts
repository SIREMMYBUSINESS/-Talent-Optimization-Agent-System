export interface MetricCard {
  title: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  icon?: string;
}

export interface CandidatePipeline {
  stage: string;
  count: number;
  percentage: number;
}

export interface JobPosting {
  id: string;
  title: string;
  department: string;
  status: string;
  applicants: number;
  timeToFill?: number;
  postedAt: string;
}

export interface ScreeningResult {
  id: string;
  candidateName: string;
  jobTitle: string;
  overallScore: number;
  recommendation: string;
  matchedSkills: string[];
  biasFlags: string[];
  screenedAt: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  eventType: string;
  userId: string;
  payload: Record<string, any>;
}

export interface OnboardingTask {
  id: string;
  employeeName: string;
  taskTitle: string;
  status: 'pending' | 'in_progress' | 'completed';
  dueDate: string;
}

export interface TeamMetrics {
  totalHeadcount: number;
  newHires: number;
  attritionRate: number;
  diversityMetrics: {
    label: string;
    value: number;
  }[];
}

export interface DashboardFilters {
  dateRange: {
    start: Date;
    end: Date;
  };
  department?: string;
  status?: string;
}

export type TimeRangePreset = '7d' | '30d' | '90d' | 'custom';

export interface TimeRangeFilter {
  preset: TimeRangePreset;
  customStart?: Date;
  customEnd?: Date;
}

export interface ComplianceAlert {
  id: string;
  flagType: string;
  severity: 'low' | 'medium' | 'high';
  status: 'open' | 'reviewed' | 'escalated';
  affectedCandidateCount: number;
  description: string;
  timestamp: string;
  actionable: boolean;
}

export interface DPMechanismMetrics {
  mechanism: 'laplace' | 'gaussian';
  sampleCount: number;
  epsilonBudget: number;
  averageNoiseScale: number;
  confidenceIntervalWidth: number;
}

export interface DPComparison {
  originalScore: number;
  privacyProtectedScore: number;
  accuracyDelta: number;
  candidateName: string;
}
