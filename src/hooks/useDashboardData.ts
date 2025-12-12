import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { TimeRangeFilter, ComplianceAlert, DPMechanismMetrics, DPComparison } from '../types/dashboard';

export const useCandidatePipeline = () => {
  return useQuery({
    queryKey: ['candidate-pipeline'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('status')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const pipeline = data.reduce((acc: Record<string, number>, app) => {
        acc[app.status] = (acc[app.status] || 0) + 1;
        return acc;
      }, {});

      const total = Object.values(pipeline).reduce((sum: number, count) => sum + (count as number), 0);

      return Object.entries(pipeline).map(([stage, count]) => ({
        stage,
        count: count as number,
        percentage: total > 0 ? ((count as number) / total) * 100 : 0,
      }));
    },
    refetchInterval: 30000,
  });
};

export const useJobPostings = () => {
  return useQuery({
    queryKey: ['job-postings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_postings')
        .select('id, title, department, status, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const postingsWithApplicants = await Promise.all(
        data.map(async (job) => {
          const { count } = await supabase
            .from('applications')
            .select('*', { count: 'exact', head: true })
            .eq('job_posting_id', job.id);

          return {
            ...job,
            applicants: count || 0,
          };
        })
      );

      return postingsWithApplicants;
    },
    refetchInterval: 30000,
  });
};

export const useScreeningResults = (limit = 10) => {
  return useQuery({
    queryKey: ['screening-results', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('screening_results')
        .select(`
          id,
          overall_score,
          recommendation,
          skills_match,
          bias_flags,
          screened_at,
          application_id,
          applications (
            candidate_id,
            job_posting_id,
            candidates (full_name),
            job_postings (title)
          )
        `)
        .order('screened_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data.map((result: any) => ({
        id: result.id,
        overallScore: result.overall_score,
        recommendation: result.recommendation,
        candidateName: result.applications?.candidates?.full_name || 'Unknown',
        jobTitle: result.applications?.job_postings?.title || 'Unknown',
        matchedSkills: result.skills_match?.matched || [],
        biasFlags: result.bias_flags || [],
        screenedAt: result.screened_at,
      }));
    },
    refetchInterval: 30000,
  });
};

export const useDashboardMetrics = () => {
  return useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const [
        { count: totalCandidates },
        { count: totalApplications },
        { count: activeJobs },
        { data: screeningData },
      ] = await Promise.all([
        supabase.from('candidates').select('*', { count: 'exact', head: true }),
        supabase.from('applications').select('*', { count: 'exact', head: true }),
        supabase.from('job_postings').select('*', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('screening_results').select('overall_score'),
      ]);

      const avgScore = screeningData?.length
        ? screeningData.reduce((sum, r) => sum + (r.overall_score || 0), 0) / screeningData.length
        : 0;

      return {
        totalCandidates: totalCandidates || 0,
        totalApplications: totalApplications || 0,
        activeJobs: activeJobs || 0,
        avgScreeningScore: Math.round(avgScore),
      };
    },
    refetchInterval: 30000,
  });
};

export const useJobDetails = (jobId: string) => {
  return useQuery({
    queryKey: ['job-details', jobId],
    queryFn: async () => {
      const { data: job, error: jobError } = await supabase
        .from('job_postings')
        .select('*')
        .eq('id', jobId)
        .maybeSingle();

      if (jobError) throw jobError;
      if (!job) throw new Error('Job not found');

      const { data: applicationsData, error: applicationsError } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          applied_at,
          notes,
          candidates (
            id,
            full_name,
            email,
            phone,
            resume_url,
            linkedin_url,
            skills,
            experience_years
          ),
          screening_results (
            id,
            overall_score,
            recommendation,
            skills_match,
            bias_flags,
            screened_at
          )
        `)
        .eq('job_posting_id', jobId)
        .order('applied_at', { ascending: false });

      if (applicationsError) throw applicationsError;

      return {
        job,
        applicants: applicationsData?.map((app: any) => ({
          applicationId: app.id,
          status: app.status,
          appliedAt: app.applied_at,
          notes: app.notes,
          candidate: {
            id: app.candidates?.id,
            fullName: app.candidates?.full_name,
            email: app.candidates?.email,
            phone: app.candidates?.phone,
            resumeUrl: app.candidates?.resume_url,
            linkedinUrl: app.candidates?.linkedin_url,
            skills: app.candidates?.skills || [],
            experienceYears: app.candidates?.experience_years || 0,
          },
          screening: app.screening_results ? {
            id: app.screening_results.id,
            overallScore: app.screening_results.overall_score,
            recommendation: app.screening_results.recommendation,
            skillsMatch: app.screening_results.skills_match,
            biasFlags: app.screening_results.bias_flags || [],
            screenedAt: app.screening_results.screened_at,
          } : null,
        })) || [],
      };
    },
    enabled: !!jobId,
    refetchInterval: 30000,
  });
};

const getDateRange = (timeRange: TimeRangeFilter): { start: Date; end: Date } => {
  const end = timeRange.customEnd || new Date();
  let start: Date;

  switch (timeRange.preset) {
    case '7d':
      start = new Date(end);
      start.setDate(start.getDate() - 7);
      break;
    case '90d':
      start = new Date(end);
      start.setDate(start.getDate() - 90);
      break;
    case '30d':
    default:
      start = new Date(end);
      start.setDate(start.getDate() - 30);
      break;
  }

  return { start: timeRange.customStart || start, end };
};

export const useComplianceAlerts = (timeRange: TimeRangeFilter, limit = 6) => {
  const { start, end } = getDateRange(timeRange);

  return useQuery({
    queryKey: ['compliance-alerts', timeRange, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compliance_decisions')
        .select(`
          id,
          flag_type,
          severity_level,
          status,
          affected_count,
          description,
          created_at
        `)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((alert: any) => ({
        id: alert.id,
        flagType: alert.flag_type,
        severity: alert.severity_level as 'low' | 'medium' | 'high',
        status: alert.status as 'open' | 'reviewed' | 'escalated',
        affectedCandidateCount: alert.affected_count || 0,
        description: alert.description,
        timestamp: alert.created_at,
        actionable: alert.status === 'open' || alert.status === 'reviewed',
      })) as ComplianceAlert[];
    },
    refetchInterval: 15000,
  });
};

export const useDPMetricsDetailed = (timeRange: TimeRangeFilter) => {
  const { start, end } = getDateRange(timeRange);

  return useQuery({
    queryKey: ['dp-metrics-detailed', timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dp_metrics')
        .select(`
          mechanism_type,
          sample_count,
          epsilon_budget,
          average_noise_scale,
          confidence_interval_width
        `)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mechanismMap = new Map<string, any>();

      (data || []).forEach((metric: any) => {
        const mechanism = metric.mechanism_type;
        if (!mechanismMap.has(mechanism)) {
          mechanismMap.set(mechanism, {
            mechanism,
            sampleCounts: [],
            epsilonBudgets: [],
            noiseLevels: [],
            ciWidths: [],
          });
        }

        const entry = mechanismMap.get(mechanism);
        entry.sampleCounts.push(metric.sample_count || 0);
        entry.epsilonBudgets.push(metric.epsilon_budget || 0);
        entry.noiseLevels.push(metric.average_noise_scale || 0);
        entry.ciWidths.push(metric.confidence_interval_width || 0);
      });

      return Array.from(mechanismMap.values()).map((entry: any) => ({
        mechanism: entry.mechanism as 'laplace' | 'gaussian',
        sampleCount: Math.ceil(entry.sampleCounts.reduce((a: number, b: number) => a + b, 0) / entry.sampleCounts.length || 0),
        epsilonBudget: parseFloat((entry.epsilonBudgets.reduce((a: number, b: number) => a + b, 0) / entry.epsilonBudgets.length || 0).toFixed(2)),
        averageNoiseScale: parseFloat((entry.noiseLevels.reduce((a: number, b: number) => a + b, 0) / entry.noiseLevels.length || 0).toFixed(4)),
        confidenceIntervalWidth: parseFloat((entry.ciWidths.reduce((a: number, b: number) => a + b, 0) / entry.ciWidths.length || 0).toFixed(2)),
      })) as DPMechanismMetrics[];
    },
    refetchInterval: 30000,
  });
};

export const useOverrideMetrics = (timeRange: TimeRangeFilter) => {
  const { start, end } = getDateRange(timeRange);

  return useQuery({
    queryKey: ['override-metrics', timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('manager_overrides')
        .select('id, escalation_status, created_at')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (error) throw error;

      const total = data?.length || 0;
      const escalated = (data || []).filter((o: any) => o.escalation_status === 'escalated').length;

      return {
        totalOverrides: total,
        escalatedCount: escalated,
        escalationPercentage: total > 0 ? (escalated / total) * 100 : 0,
      };
    },
    refetchInterval: 30000,
  });
};

export const useDPVsNonDPComparison = (timeRange: TimeRangeFilter, limit = 25) => {
  const { start, end } = getDateRange(timeRange);

  return useQuery({
    queryKey: ['dp-vs-non-dp-comparison', timeRange, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('screening_results')
        .select(`
          original_score,
          privacy_protected_score,
          application_id,
          applications (
            candidates (full_name)
          )
        `)
        .gte('screened_at', start.toISOString())
        .lte('screened_at', end.toISOString())
        .not('privacy_protected_score', 'is', null)
        .order('screened_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((result: any) => ({
        originalScore: result.original_score || 0,
        privacyProtectedScore: result.privacy_protected_score || 0,
        accuracyDelta: Math.abs((result.original_score || 0) - (result.privacy_protected_score || 0)),
        candidateName: result.applications?.candidates?.full_name || 'Unknown',
      })) as DPComparison[];
    },
    refetchInterval: 30000,
  });
};

export const useComplianceAlertActions = () => {
  const queryClient = useQueryClient();

  const updateAlertStatus = useMutation({
    mutationFn: async ({ alertId, newStatus }: { alertId: string; newStatus: string }) => {
      const { error } = await supabase
        .from('compliance_decisions')
        .update({ status: newStatus })
        .eq('id', alertId);

      if (error) throw error;
      return { alertId, newStatus };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-alerts'] });
    },
  });

  const markAsReviewed = (alertId: string) => updateAlertStatus.mutate({ alertId, newStatus: 'reviewed' });
  const escalate = (alertId: string) => updateAlertStatus.mutate({ alertId, newStatus: 'escalated' });
  const resolve = (alertId: string) => updateAlertStatus.mutate({ alertId, newStatus: 'resolved' });

  return {
    updateAlertStatus,
    markAsReviewed,
    escalate,
    resolve,
    isLoading: updateAlertStatus.isPending,
    isError: updateAlertStatus.isError,
  };
};

export const useScreeningMetrics = (timeRange: TimeRangeFilter) => {
  const { start, end } = getDateRange(timeRange);

  return useQuery({
    queryKey: ['screening-metrics', timeRange],
    queryFn: async () => {
      const { data: results, error } = await supabase
        .from('screening_results')
        .select('overall_score, privacy_protected_score, screened_at')
        .gte('screened_at', start.toISOString())
        .lte('screened_at', end.toISOString());

      if (error) throw error;

      const dpScores = results?.filter((r: any) => r.privacy_protected_score !== null) || [];
      const nonDpScores = results?.filter((r: any) => r.privacy_protected_score === null) || [];

      const dpAccuracy = dpScores.length
        ? dpScores.reduce((sum: number, r: any) => sum + r.privacy_protected_score, 0) / dpScores.length
        : 0;

      const nonDpAccuracy = nonDpScores.length
        ? nonDpScores.reduce((sum: number, r: any) => sum + r.overall_score, 0) / nonDpScores.length
        : 0;

      const avgLatency = results?.length
        ? results.reduce((sum: number, r: any) => {
            const created = new Date(r.screened_at);
            return sum + (Date.now() - created.getTime());
          }, 0) / results.length / 1000
        : 0;

      return {
        dpAccuracy: Math.round(dpAccuracy),
        nonDpAccuracy: Math.round(nonDpAccuracy),
        totalScreenings: results?.length || 0,
        avgLatencySeconds: Math.round(avgLatency),
        confidenceDistribution: {
          high: results?.filter((r: any) => r.overall_score >= 80).length || 0,
          medium: results?.filter((r: any) => r.overall_score >= 60 && r.overall_score < 80).length || 0,
          low: results?.filter((r: any) => r.overall_score < 60).length || 0,
        },
      };
    },
    refetchInterval: 30000,
  });
};

export const useAnalyticsData = (timeRange: TimeRangeFilter) => {
  const { start, end } = getDateRange(timeRange);

  return useQuery({
    queryKey: ['analytics-data', timeRange],
    queryFn: async () => {
      const { data: apps, error } = await supabase
        .from('applications')
        .select('status, created_at')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (error) throw error;

      const stages = {
        resume: apps?.length || 0,
        screening: apps?.filter((a: any) => a.status === 'screening_reviewed').length || 0,
        interview: apps?.filter((a: any) => a.status === 'interview_scheduled').length || 0,
        offer: apps?.filter((a: any) => a.status === 'offer_extended').length || 0,
        hire: apps?.filter((a: any) => a.status === 'hired').length || 0,
      };

      const funnel = [
        { stage: 'Resume', value: stages.resume, percentage: 100 },
        { stage: 'Screening', value: stages.screening, percentage: stages.resume > 0 ? (stages.screening / stages.resume) * 100 : 0 },
        { stage: 'Interview', value: stages.interview, percentage: stages.screening > 0 ? (stages.interview / stages.screening) * 100 : 0 },
        { stage: 'Offer', value: stages.offer, percentage: stages.interview > 0 ? (stages.offer / stages.interview) * 100 : 0 },
        { stage: 'Hire', value: stages.hire, percentage: stages.offer > 0 ? (stages.hire / stages.offer) * 100 : 0 },
      ];

      const dropoff = [
        { name: 'Resume to Screening', value: Math.max(0, stages.resume - stages.screening) },
        { name: 'Screening to Interview', value: Math.max(0, stages.screening - stages.interview) },
        { name: 'Interview to Offer', value: Math.max(0, stages.interview - stages.offer) },
        { name: 'Offer to Hire', value: Math.max(0, stages.offer - stages.hire) },
      ];

      return { funnel, dropoff };
    },
    refetchInterval: 30000,
  });
};

export const useTalentInsights = (timeRange: TimeRangeFilter) => {
  const { start, end } = getDateRange(timeRange);

  return useQuery({
    queryKey: ['talent-insights', timeRange],
    queryFn: async () => {
      const { data: results, error } = await supabase
        .from('screening_results')
        .select('overall_score, skills_match')
        .gte('screened_at', start.toISOString())
        .lte('screened_at', end.toISOString());

      if (error) throw error;

      const skillFrequency: Record<string, number> = {};
      results?.forEach((r: any) => {
        const skills = r.skills_match?.matched || [];
        skills.forEach((skill: string) => {
          skillFrequency[skill] = (skillFrequency[skill] || 0) + 1;
        });
      });

      const topSkills = Object.entries(skillFrequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([skill, count]) => ({ skill, proficiency: Math.min(count * 10, 100) }));

      const avgScore = results?.length
        ? results.reduce((sum: number, r: any) => sum + r.overall_score, 0) / results.length
        : 0;

      return {
        avgHiringScore: Math.round(avgScore),
        topSkills,
        totalScreened: results?.length || 0,
      };
    },
    refetchInterval: 30000,
  });
};

export const useComplianceViolations = (timeRange: TimeRangeFilter, limit = 50) => {
  const { start, end } = getDateRange(timeRange);

  return useQuery({
    queryKey: ['compliance-violations', timeRange, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compliance_decisions')
        .select('id, flag_type, severity_level, status, description, created_at')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((v: any) => ({
        id: v.id,
        flagType: v.flag_type,
        severity: v.severity_level as 'low' | 'medium' | 'high',
        status: v.status as 'open' | 'reviewed' | 'escalated',
        description: v.description,
        createdAt: v.created_at,
      }));
    },
    refetchInterval: 30000,
  });
};

export const useAuditLogs = (timeRange: TimeRangeFilter, searchTerm?: string, limit = 100) => {
  const { start, end } = getDateRange(timeRange);

  return useQuery({
    queryKey: ['audit-logs', timeRange, searchTerm, limit],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('id, event_type, user_id, payload, created_at')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false })
        .limit(limit);

      if (searchTerm) {
        query = query.ilike('event_type', `%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((log: any) => ({
        id: log.id,
        eventType: log.event_type,
        userId: log.user_id,
        payload: log.payload,
        createdAt: log.created_at,
      }));
    },
    refetchInterval: 30000,
  });
};
