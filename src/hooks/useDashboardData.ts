import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

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
