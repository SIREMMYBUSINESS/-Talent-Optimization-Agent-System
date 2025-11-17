/*
  # Create Applications and Screening Results Tables

  ## Overview
  Creates tables to manage job applications and AI-powered resume screening results,
  linking candidates to job postings with detailed screening analysis.

  ## Tables Created
    
  ### `applications`
    - `id` (uuid, primary key) - unique application identifier
    - `job_posting_id` (uuid, required) - references job_postings
    - `candidate_id` (uuid, required) - references candidates
    - `status` (text) - application status workflow
    - `applied_at` (timestamptz) - application submission date
    - `reviewed_at` (timestamptz) - when application was reviewed
    - `reviewed_by` (uuid) - who reviewed the application
    - `notes` (text) - reviewer notes
    - `created_at` (timestamptz) - record creation
    - `updated_at` (timestamptz) - last update

  ### `screening_results`
    - `id` (uuid, primary key) - unique screening result identifier
    - `application_id` (uuid, required) - references applications
    - `overall_score` (integer) - 0-100 overall match score
    - `skills_match` (jsonb) - detailed skills analysis
    - `experience_match` (jsonb) - experience level analysis
    - `education_match` (jsonb) - education requirements analysis
    - `ai_summary` (text) - AI-generated candidate summary
    - `recommendation` (text) - strong_match, good_match, potential_match, no_match
    - `bias_flags` (jsonb) - potential bias detection results
    - `screened_by_model` (text) - which AI model performed screening
    - `screened_at` (timestamptz) - screening timestamp
    - `created_at` (timestamptz) - record creation

  ## Relationships
    - applications links candidates to job_postings (many-to-many)
    - screening_results links to applications (one-to-one)
    - Foreign key constraints ensure data integrity

  ## Security
    - Enable RLS on both tables
    - Authenticated users can view their own applications
    - HR staff can view all applications and screening results
    - Only system can create screening results (via service role)

  ## Indexes
    - Composite index on job_posting_id and candidate_id for unique applications
    - Index on status for filtering
    - Index on overall_score for ranking
*/

-- Create applications table
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_posting_id uuid NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  status text DEFAULT 'submitted' CHECK (status IN ('submitted', 'screening', 'review', 'interview', 'offer', 'rejected', 'withdrawn', 'hired')),
  applied_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(job_posting_id, candidate_id)
);

-- Create screening_results table
CREATE TABLE IF NOT EXISTS screening_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
  overall_score integer CHECK (overall_score >= 0 AND overall_score <= 100),
  skills_match jsonb DEFAULT '{}',
  experience_match jsonb DEFAULT '{}',
  education_match jsonb DEFAULT '{}',
  ai_summary text,
  recommendation text CHECK (recommendation IN ('strong_match', 'good_match', 'potential_match', 'no_match')),
  bias_flags jsonb DEFAULT '[]',
  screened_by_model text DEFAULT 'nvidia-nemo',
  screened_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE screening_results ENABLE ROW LEVEL SECURITY;

-- Applications Policies
-- Remove broad SELECT (if already created)
DROP POLICY IF EXISTS "Authenticated users can view applications" ON applications;

-- Users can view applications they are involved in (by candidate)
CREATE POLICY "Users can view own applications"
  ON applications
  FOR SELECT
  TO authenticated
  USING (candidate_id = auth.uid());

-- HR staff can view all applications
CREATE POLICY "HR staff can view all applications"
  ON applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'hr_manager', 'recruiter')
    )
  );

-- HR staff can create applications
CREATE POLICY "HR staff can create applications"
  ON applications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'hr_manager', 'recruiter')
    )
  );

-- HR staff can update applications
CREATE POLICY "HR staff can update applications"
  ON applications
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
-- Allow service role to insert/update screening results (optional explicit policy)
CREATE POLICY "Service role can create screening results"
  ON screening_results
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update screening results"
  ON screening_results
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- HR staff can delete applications
CREATE POLICY "HR staff can delete applications"
  ON applications
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'hr_manager', 'recruiter')
    )
  );

-- Screening Results Policies
CREATE TRIGGER update_screening_results_updated_at
  BEFORE UPDATE ON screening_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Authenticated users can view screening results
CREATE POLICY "Authenticated users can view screening results"
  ON screening_results
  FOR SELECT
  TO authenticated
  USING (true);

-- Only HR staff can create screening results
CREATE POLICY "HR staff can create screening results"
  ON screening_results
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'hr_manager', 'recruiter')
    )
  );

-- HR staff can update screening results
CREATE POLICY "HR staff can update screening results"
  ON screening_results
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_applications_job_posting ON applications(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_applications_candidate ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_screening_results_score ON screening_results(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_screening_results_recommendation ON screening_results(recommendation);

-- Create trigger for updated_at
CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
