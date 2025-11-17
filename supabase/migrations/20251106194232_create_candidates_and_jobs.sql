/*
  # Create Candidates and Job Postings Tables

  ## Overview
  Creates tables for managing job postings and candidate applications in the talent optimization system.

  ## Tables Created
    
  ### `job_postings`
    - `id` (uuid, primary key) - unique job posting identifier
    - `title` (text, required) - job title
    - `description` (text) - detailed job description
    - `requirements` (jsonb) - structured requirements (skills, experience, education)
    - `department` (text) - department hiring for
    - `location` (text) - job location
    - `employment_type` (text) - full-time, part-time, contract, etc.
    - `salary_range` (jsonb) - min/max salary information
    - `status` (text) - draft, published, closed
    - `posted_by` (uuid) - references user who posted the job
    - `created_at` (timestamptz) - posting creation date
    - `updated_at` (timestamptz) - last update date
    - `closed_at` (timestamptz) - when posting was closed

  ### `candidates`
    - `id` (uuid, primary key) - unique candidate identifier
    - `full_name` (text, required) - candidate's full name
    - `email` (text, required, unique) - contact email
    - `phone` (text) - contact phone
    - `resume_url` (text) - URL to resume document
    - `resume_text` (text) - extracted resume text for analysis
    - `linkedin_url` (text) - LinkedIn profile URL
    - `skills` (jsonb) - structured skills data
    - `experience_years` (integer) - total years of experience
    - `education` (jsonb) - education history
    - `source` (text) - how candidate was sourced
    - `created_at` (timestamptz) - record creation date
    - `updated_at` (timestamptz) - last update date

  ## Security
    - Enable RLS on both tables
    - Authenticated users can view published job postings
    - HR managers and recruiters can create and manage job postings
    - Authenticated users can view candidates
    - Only HR managers and recruiters can create/update candidate records

  ## Indexes
    - Index on job_postings status and department for filtering
    - Index on candidates email for quick lookups
*/

-- Create job_postings table
CREATE TABLE IF NOT EXISTS job_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  requirements jsonb DEFAULT '{}',
  department text,
  location text,
  employment_type text DEFAULT 'full-time' CHECK (employment_type IN ('full-time', 'part-time', 'contract', 'temporary', 'internship')),
  salary_range jsonb DEFAULT '{}',
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
  posted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  closed_at timestamptz
);

-- Create candidates table
CREATE TABLE IF NOT EXISTS candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  resume_url text,
  resume_text text,
  linkedin_url text,
  skills jsonb DEFAULT '[]',
  experience_years integer DEFAULT 0,
  education jsonb DEFAULT '[]',
  source text DEFAULT 'direct_application',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

-- Job Postings Policies

-- Anyone authenticated can view published job postings
CREATE POLICY "Authenticated users can view published jobs"
  ON job_postings
  FOR SELECT
  TO authenticated
  USING (status = 'published' OR posted_by = auth.uid());

-- HR managers and recruiters can create job postings
CREATE POLICY "HR staff can create job postings"
  ON job_postings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'hr_manager', 'recruiter')
    )
  );

-- HR managers and recruiters can update job postings
CREATE POLICY "HR staff can update job postings"
  ON job_postings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'hr_manager', 'recruiter')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'hr_manager', 'recruiter')
    )
  );

-- HR managers and recruiters can delete job postings
CREATE POLICY "HR staff can delete job postings"
  ON job_postings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'hr_manager', 'recruiter')
    )
  );

-- Candidates Policies

-- Authenticated users can view candidates
CREATE POLICY "Authenticated users can view candidates"
  ON candidates
  FOR SELECT
  TO authenticated
  USING (true);

-- HR staff can create candidate records
CREATE POLICY "HR staff can create candidates"
  ON candidates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'hr_manager', 'recruiter')
    )
  );

-- HR staff can update candidate records
CREATE POLICY "HR staff can update candidates"
  ON candidates
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'hr_manager', 'recruiter')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'hr_manager', 'recruiter')
    )
  );

-- HR staff can delete candidate records
CREATE POLICY "HR staff can delete candidates"
  ON candidates
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'hr_manager', 'recruiter')
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_postings_status ON job_postings(status);
CREATE INDEX IF NOT EXISTS idx_job_postings_department ON job_postings(department);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);

-- Create triggers for updated_at
CREATE TRIGGER update_job_postings_updated_at
  BEFORE UPDATE ON job_postings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at
  BEFORE UPDATE ON candidates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
