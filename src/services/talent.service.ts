import { apiService } from './api.service';

export interface Candidate {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  resume_url?: string;
  resume_text?: string;
  linkedin_url?: string;
  skills: string[];
  experience_years: number;
  education: any[];
  source: string;
  created_at: string;
  updated_at: string;
}

export interface JobPosting {
  id: string;
  title: string;
  description?: string;
  requirements: any;
  department?: string;
  location?: string;
  employment_type: string;
  salary_range: any;
  status: string;
  posted_by?: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
}

export interface Application {
  id: string;
  job_posting_id: string;
  candidate_id: string;
  status: string;
  applied_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  notes?: string;
  flagged?: boolean;
  compliance_flags?: {
    type: string;
    severity: 'low' | 'medium' | 'high';
    reason: string;
    flagged_at?: string;
    flagged_by?: string;
  }[];
  created_at: string;
  updated_at: string;
  job_postings?: JobPosting;
  candidates?: Candidate;
  screening_results?: ScreeningResult;
}

export interface ScreeningResult {
  id: string;
  application_id: string;
  overall_score: number;
  skills_match: any;
  experience_match: any;
  education_match: any;
  ai_summary: string;
  recommendation: string;
  bias_flags: any[];
  screened_by_model: string;
  screened_at: string;
  created_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  limit: number;
  offset: number;
}

class TalentService {
  async createCandidate(data: {
    full_name: string;
    email: string;
    phone?: string;
    linkedin_url?: string;
    skills?: string[];
    experience_years?: number;
    education?: any[];
    source?: string;
  }): Promise<Candidate> {
    return apiService.post<Candidate>('/api/v1/candidates', data);
  }

  async listCandidates(params?: {
    limit?: number;
    offset?: number;
    source?: string;
  }): Promise<PaginatedResponse<Candidate>> {
    return apiService.get<PaginatedResponse<Candidate>>('/api/v1/candidates', {
      params,
    });
  }

  async getCandidate(id: string): Promise<Candidate> {
    return apiService.get<Candidate>(`/api/v1/candidates/${id}`);
  }

  async updateCandidate(
    id: string,
    data: {
      full_name?: string;
      phone?: string;
      linkedin_url?: string;
      skills?: string[];
      experience_years?: number;
      education?: any[];
    }
  ): Promise<Candidate> {
    return apiService.patch<Candidate>(`/api/v1/candidates/${id}`, data);
  }

  async uploadResume(candidateId: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    return apiService.uploadFile(`/api/v1/candidates/${candidateId}/upload-resume`, formData);
  }

  async createJobPosting(data: {
    title: string;
    description?: string;
    requirements?: any;
    department?: string;
    location?: string;
    employment_type?: string;
    salary_range?: any;
    status?: string;
  }): Promise<JobPosting> {
    return apiService.post<JobPosting>('/api/v1/jobs', data);
  }

  async listJobPostings(params?: {
    limit?: number;
    offset?: number;
    status?: string;
    department?: string;
  }): Promise<PaginatedResponse<JobPosting>> {
    return apiService.get<PaginatedResponse<JobPosting>>('/api/v1/jobs', {
      params,
    });
  }

  async getJobPosting(id: string): Promise<JobPosting> {
    return apiService.get<JobPosting>(`/api/v1/jobs/${id}`);
  }

  async updateJobPosting(
    id: string,
    data: {
      title?: string;
      description?: string;
      requirements?: any;
      department?: string;
      location?: string;
      employment_type?: string;
      salary_range?: any;
      status?: string;
    }
  ): Promise<JobPosting> {
    return apiService.patch<JobPosting>(`/api/v1/jobs/${id}`, data);
  }

  async createApplication(data: {
    job_posting_id: string;
    candidate_id: string;
    notes?: string;
  }): Promise<Application> {
    return apiService.post<Application>('/api/v1/applications', data);
  }

  async listApplications(params?: {
    limit?: number;
    offset?: number;
    status?: string;
    job_id?: string;
    candidate_id?: string;
    flagged?: boolean;
  }): Promise<PaginatedResponse<Application>> {
    return apiService.get<PaginatedResponse<Application>>('/api/v1/applications', {
      params,
    });
  }

  async getApplication(id: string): Promise<Application> {
    return apiService.get<Application>(`/api/v1/applications/${id}`);
  }

  async updateApplication(
    id: string,
    data: {
      status?: string;
      notes?: string;
    }
  ): Promise<Application> {
    return apiService.patch<Application>(`/api/v1/applications/${id}`, data);
  }

  async screenApplication(
    applicationId: string,
    data: {
      application_id: string;
      required_certifications?: string[];
    }
  ): Promise<ScreeningResult> {
    return apiService.post<ScreeningResult>(
      `/api/v1/applications/${applicationId}/screen`,
      data
    );
  }

  async getScreeningResults(applicationId: string): Promise<ScreeningResult> {
    return apiService.get<ScreeningResult>(`/api/v1/screening-results/${applicationId}`);
  }
}

export const talentService = new TalentService();
