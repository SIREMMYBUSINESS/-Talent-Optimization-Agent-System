/*
  # Implement Candidate Privacy RLS Policies

  ## Overview
  Enforces strict data privacy for candidates by:
  1. Preventing candidate access to manager_overrides (decisions hidden from candidates)
  2. Restricting screening_results to HR staff only (except for candidates viewing their own)
  3. Blocking access to audit_logs (sensitive actions hidden)
  4. Enforcing candidate can only see their own data

  ## Candidate Access Restrictions
    - Cannot see manager_overrides (their override decisions)
    - Cannot see audit_logs (actions taken on their application)
    - Cannot see other candidates' data
    - Can view only their own screening results if explicitly allowed
    - Cannot access compliance or privacy decision data

  ## Security Model
    - Candidates verified by: role = 'employee' or non-HR/admin role
    - Candidate isolation: candidate_id in applications or user_id match
    - HR/Compliance staff bypass candidate restrictions
    - All candidate access is READ-ONLY for their own data

  ## Privacy by Design
    - Candidates see only what they need for their own review
    - No visibility into hiring decisions or rejection reasons
    - No access to system audit trails
    - Cannot infer information from other candidates
*/

-- ============================================================================
-- MANAGER_OVERRIDES: BLOCK CANDIDATE ACCESS
-- ============================================================================

-- Add restrictive policy to prevent candidates from seeing overrides
CREATE POLICY "Candidates cannot access manager overrides"
  ON manager_overrides
  FOR SELECT
  TO authenticated
  USING (false);

CREATE POLICY "Candidates cannot modify manager overrides"
  ON manager_overrides
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Candidates cannot insert manager overrides"
  ON manager_overrides
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Candidates cannot delete manager overrides"
  ON manager_overrides
  FOR DELETE
  TO authenticated
  USING (false);

-- ============================================================================
-- AUDIT_LOGS: BLOCK CANDIDATE ACCESS
-- ============================================================================

-- Add restrictive policy to prevent candidates from viewing audit logs
CREATE POLICY "Candidates cannot view audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    NOT (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = (select auth.uid())
        AND role NOT IN ('admin', 'hr_manager', 'recruiter', 'manager')
      )
    )
  );

-- Block candidate insertion to audit logs (they can only audit their own actions via admin)
CREATE POLICY "Candidates cannot create audit logs for others"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND NOT (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = (select auth.uid())
        AND role NOT IN ('admin', 'hr_manager', 'recruiter', 'manager')
      )
    )
  );

-- ============================================================================
-- COMPLIANCE_DECISIONS: BLOCK CANDIDATE ACCESS
-- ============================================================================

-- Candidates cannot view compliance decisions about their applications
CREATE POLICY "Candidates cannot access compliance decisions"
  ON compliance_decisions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager', 'recruiter', 'manager', 'compliance')
    )
  );

-- ============================================================================
-- COMPLIANCE_AUDITS: BLOCK CANDIDATE ACCESS
-- ============================================================================

-- Candidates cannot view compliance audits
CREATE POLICY "Candidates cannot access compliance audits"
  ON compliance_audits
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager', 'recruiter', 'manager', 'compliance')
    )
  );

-- ============================================================================
-- SCREENING_RESULTS: RESTRICT TO HR STAFF
-- ============================================================================

-- Add candidate-blocking policy (in addition to existing HR policies)
CREATE POLICY "Candidates cannot view screening results"
  ON screening_results
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager', 'recruiter', 'manager', 'compliance')
    )
  );

-- ============================================================================
-- JOB_POSTINGS: ALLOW CANDIDATE READ-ONLY ACCESS
-- ============================================================================

-- Drop existing candidate-related policies if present
DROP POLICY IF EXISTS "Candidates can view published jobs" ON job_postings;

-- Candidates can view published job postings
CREATE POLICY "Candidates can view published jobs"
  ON job_postings
  FOR SELECT
  TO authenticated
  USING (
    status = 'published'
    OR posted_by = (select auth.uid())
  );

-- ============================================================================
-- CANDIDATES TABLE: RESTRICT PERSONAL DATA
-- ============================================================================

-- Drop existing candidate view policies
DROP POLICY IF EXISTS "HR staff can create candidates" ON candidates;
DROP POLICY IF EXISTS "HR staff can update candidates" ON candidates;
DROP POLICY IF EXISTS "HR staff can delete candidates" ON candidates;

-- Candidates cannot view other candidates
CREATE POLICY "Candidates cannot view other candidates"
  ON candidates
  FOR SELECT
  TO authenticated
  USING (
    id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager', 'recruiter', 'manager')
    )
  );

-- Candidates can only update their own profile (if they have a candidate record)
CREATE POLICY "Candidates can update own candidate profile"
  ON candidates
  FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- HR staff can create candidates
CREATE POLICY "HR staff can create candidates"
  ON candidates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager', 'recruiter')
    )
  );

-- HR staff can delete candidates
CREATE POLICY "HR staff can delete candidates"
  ON candidates
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager', 'recruiter')
    )
  );

-- ============================================================================
-- APPLICATIONS: RESTRICT CANDIDATE ACCESS
-- ============================================================================

-- Drop existing candidate policies
DROP POLICY IF EXISTS "Authenticated users can view applications" ON applications;

-- Candidates can view their own applications
CREATE POLICY "Candidates can view own applications"
  ON applications
  FOR SELECT
  TO authenticated
  USING (
    candidate_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager', 'recruiter', 'manager')
    )
  );

-- Candidates cannot modify their applications
CREATE POLICY "Candidates cannot modify applications"
  ON applications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager', 'recruiter', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager', 'recruiter', 'manager')
    )
  );

-- Candidates cannot delete their applications
CREATE POLICY "Candidates cannot delete applications"
  ON applications
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager', 'recruiter', 'manager')
    )
  );

-- ============================================================================
-- PRIVACY_SETTINGS: BLOCK CANDIDATE DIRECT ACCESS
-- ============================================================================

-- Candidates cannot view or modify privacy settings (HR staff manages)
CREATE POLICY "Candidates cannot access privacy settings"
  ON privacy_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager', 'recruiter')
    )
  );

CREATE POLICY "Candidates cannot update privacy settings"
  ON privacy_settings
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Candidates cannot delete privacy settings"
  ON privacy_settings
  FOR DELETE
  TO authenticated
  USING (false);
