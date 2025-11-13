import { createClient } from '@supabase/supabase-js';
import { nlpResumeProcessor, ExtractedResumeData, MatchResult } from './nlpResumeProcessor';
import { DifferentialPrivacyManager } from '../ml/privacy/DifferentialPrivacy';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface CandidateProfile {
  id: string;
  resume_id: string;
  user_id: string;
  candidate_hash: string;
  years_experience: number;
  education_level: string;
  match_score: number;
  confidence_score: number;
  created_at: string;
  updated_at: string;
}

export interface CandidateSkill {
  id: string;
  candidate_id: string;
  skill_name: string;
  skill_category: 'technical' | 'soft' | 'domain' | 'certification';
  proficiency_level: string;
  years_experience: number;
  match_relevance: number;
}

export interface JobRequirement {
  id: string;
  user_id: string;
  job_title: string;
  department: string;
  required_skills: string[];
  preferred_skills: string[];
  min_experience: number;
  education_required: string;
  active: boolean;
  created_at: string;
}

export interface RoleRecommendation {
  id: string;
  candidate_id: string;
  job_id: string;
  compatibility_score: number;
  skill_match_score: number;
  experience_match_score: number;
  reasoning: string;
  recommended_at: string;
  job?: JobRequirement;
}

export class ResumeScreeningService {
  private privacyManager: DifferentialPrivacyManager;

  constructor() {
    this.privacyManager = new DifferentialPrivacyManager({
      epsilon: 1.0,
      delta: 1e-5,
      clipNorm: 1.0,
      noiseMultiplier: 1.1
    });
  }

  async processResumeFile(
    resumeId: string,
    resumeText: string,
    userId: string
  ): Promise<{ success: boolean; candidateId?: string; error?: string }> {
    try {
      await supabase
        .from('resume_uploads')
        .update({ upload_status: 'processing' })
        .eq('id', resumeId);

      const extractedData = await nlpResumeProcessor.processResume(resumeText);

      const candidateHash = this.generateAnonymousHash();

      const { data: candidate, error: candidateError } = await supabase
        .from('candidate_profiles')
        .insert({
          resume_id: resumeId,
          user_id: userId,
          candidate_hash: candidateHash,
          years_experience: extractedData.experience.totalYears,
          education_level: extractedData.education.highestDegree,
          match_score: 0,
          confidence_score: 0
        })
        .select()
        .maybeSingle();

      if (candidateError || !candidate) {
        throw new Error(candidateError?.message || 'Failed to create candidate profile');
      }

      await this.saveSkills(candidate.id, extractedData.skills);

      await this.logPrivacyOperation('resume_processing', userId, 1);

      await supabase
        .from('resume_uploads')
        .update({
          upload_status: 'completed',
          processed_at: new Date().toISOString()
        })
        .eq('id', resumeId);

      return { success: true, candidateId: candidate.id };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Processing failed';

      await supabase
        .from('resume_uploads')
        .update({
          upload_status: 'failed',
          error_message: errorMessage
        })
        .eq('id', resumeId);

      return { success: false, error: errorMessage };
    }
  }

  private generateAnonymousHash(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `candidate_${timestamp}_${random}`;
  }

  private async saveSkills(candidateId: string, skills: ExtractedResumeData['skills']): Promise<void> {
    const skillRecords = skills.map(skill => ({
      candidate_id: candidateId,
      skill_name: skill.name,
      skill_category: skill.category,
      proficiency_level: skill.proficiency,
      years_experience: skill.yearsExperience,
      match_relevance: skill.relevance
    }));

    const { error } = await supabase
      .from('candidate_skills')
      .insert(skillRecords);

    if (error) {
      throw new Error(`Failed to save skills: ${error.message}`);
    }
  }

  async getCandidateProfile(candidateId: string): Promise<CandidateProfile | null> {
    const { data, error } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('id', candidateId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async getCandidateSkills(candidateId: string): Promise<CandidateSkill[]> {
    const { data, error } = await supabase
      .from('candidate_skills')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('match_relevance', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  }

  async getAllCandidates(userId: string): Promise<CandidateProfile[]> {
    const { data, error } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('user_id', userId)
      .order('match_score', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  }

  async createJobRequirement(
    userId: string,
    jobData: {
      job_title: string;
      department: string;
      required_skills: string[];
      preferred_skills: string[];
      min_experience: number;
      education_required: string;
    }
  ): Promise<JobRequirement> {
    const { data, error } = await supabase
      .from('job_requirements')
      .insert({
        user_id: userId,
        ...jobData,
        active: true
      })
      .select()
      .maybeSingle();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to create job requirement');
    }

    return data;
  }

  async getJobRequirements(userId: string): Promise<JobRequirement[]> {
    const { data, error } = await supabase
      .from('job_requirements')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  }

  async matchCandidateToJobs(
    candidateId: string,
    userId: string
  ): Promise<RoleRecommendation[]> {
    const candidate = await this.getCandidateProfile(candidateId);
    if (!candidate) {
      throw new Error('Candidate not found');
    }

    const skills = await this.getCandidateSkills(candidateId);
    const jobs = await this.getJobRequirements(userId);

    const recommendations: RoleRecommendation[] = [];

    for (const job of jobs) {
      const extractedData: ExtractedResumeData = {
        skills: skills.map(s => ({
          name: s.skill_name,
          category: s.skill_category,
          proficiency: s.proficiency_level as any,
          yearsExperience: s.years_experience,
          relevance: s.match_relevance
        })),
        experience: {
          totalYears: candidate.years_experience,
          roles: []
        },
        education: {
          highestDegree: candidate.education_level,
          field: 'Unknown',
          institution: 'Redacted'
        },
        certifications: [],
        summary: ''
      };

      const matchResult = await nlpResumeProcessor.matchAgainstJob(extractedData, {
        requiredSkills: job.required_skills,
        preferredSkills: job.preferred_skills,
        minExperience: job.min_experience,
        educationRequired: job.education_required
      });

      const { data: recommendation, error } = await supabase
        .from('role_recommendations')
        .insert({
          candidate_id: candidateId,
          job_id: job.id,
          compatibility_score: matchResult.matchScore,
          skill_match_score: matchResult.experienceMatch,
          experience_match_score: matchResult.experienceMatch,
          reasoning: matchResult.recommendations.join('; ')
        })
        .select()
        .maybeSingle();

      if (!error && recommendation) {
        recommendations.push({ ...recommendation, job });
      }

      await supabase
        .from('candidate_profiles')
        .update({
          match_score: Math.max(candidate.match_score, matchResult.matchScore),
          confidence_score: matchResult.confidenceScore,
          updated_at: new Date().toISOString()
        })
        .eq('id', candidateId);
    }

    await this.logPrivacyOperation('candidate_matching', userId, 1);

    return recommendations;
  }

  async getRoleRecommendations(candidateId: string): Promise<RoleRecommendation[]> {
    const { data, error } = await supabase
      .from('role_recommendations')
      .select(`
        *,
        job:job_requirements(*)
      `)
      .eq('candidate_id', candidateId)
      .order('compatibility_score', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  }

  async getCandidatesByScoreRange(
    userId: string,
    minScore: number,
    maxScore: number
  ): Promise<CandidateProfile[]> {
    const { data, error } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('user_id', userId)
      .gte('match_score', minScore)
      .lte('match_score', maxScore)
      .order('match_score', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  }

  async getTopCandidates(userId: string, limit: number = 10): Promise<CandidateProfile[]> {
    const { data, error } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('user_id', userId)
      .order('match_score', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  }

  async getSkillDistribution(userId: string): Promise<{ [skill: string]: number }> {
    const { data, error } = await supabase
      .from('candidate_skills')
      .select(`
        skill_name,
        candidate:candidate_profiles!inner(user_id)
      `)
      .eq('candidate.user_id', userId);

    if (error) {
      throw new Error(error.message);
    }

    const distribution: { [skill: string]: number } = {};

    data?.forEach((record: any) => {
      const skill = record.skill_name;
      distribution[skill] = (distribution[skill] || 0) + 1;
    });

    Object.keys(distribution).forEach(skill => {
      distribution[skill] = this.privacyManager.privateAggregation(
        [distribution[skill]],
        'count'
      );
    });

    return distribution;
  }

  private async logPrivacyOperation(
    operationType: string,
    userId: string,
    dataSubjects: number
  ): Promise<void> {
    await supabase.from('privacy_audit_log').insert({
      operation_type: operationType,
      epsilon_used: 0.1,
      data_subjects_affected: dataSubjects,
      user_id: userId
    });
  }

  async getPrivacyReport(userId: string) {
    const { data, error } = await supabase
      .from('privacy_audit_log')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) {
      throw new Error(error.message);
    }

    const totalEpsilonUsed = data?.reduce((sum, log) => sum + log.epsilon_used, 0) || 0;

    return {
      totalOperations: data?.length || 0,
      totalEpsilonUsed,
      remainingBudget: Math.max(0, 1.0 - totalEpsilonUsed),
      recentOperations: data || [],
      privacyLevel: totalEpsilonUsed <= 0.5 ? 'High' : totalEpsilonUsed <= 1.0 ? 'Medium' : 'Low',
      processorReport: nlpResumeProcessor.getPrivacyReport()
    };
  }
}

export const resumeScreeningService = new ResumeScreeningService();
