/*
  # Optimize RLS Policies for Performance

  ## Overview
  Optimizes all RLS policies by wrapping auth.uid() calls in SELECT statements.
  This prevents re-evaluation of auth functions for each row, significantly
  improving query performance at scale.

  ## Changes
    1. Drop all existing RLS policies
    2. Recreate policies with optimized (select auth.uid()) syntax
    3. Merge multiple permissive SELECT policies into single policies

  ## Security Impact
    - No change to security model
    - Same access control rules
    - Improved performance at scale
*/

-- ============================================================================
-- USER PROFILES - Optimize and merge policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Merged SELECT policy (users can view own OR admins can view all)
CREATE POLICY "Users can view profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    (select auth.uid()) = id
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

CREATE POLICY "Users can create own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- ============================================================================
-- JOB POSTINGS - Optimize policies
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view published jobs" ON job_postings;
DROP POLICY IF EXISTS "HR staff can create job postings" ON job_postings;
DROP POLICY IF EXISTS "HR staff can update job postings" ON job_postings;
DROP POLICY IF EXISTS "HR staff can delete job postings" ON job_postings;

CREATE POLICY "Authenticated users can view published jobs"
  ON job_postings
  FOR SELECT
  TO authenticated
  USING (status = 'published' OR posted_by = (select auth.uid()));

CREATE POLICY "HR staff can create job postings"
  ON job_postings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager', 'recruiter')
    )
  );

CREATE POLICY "HR staff can update job postings"
  ON job_postings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager', 'recruiter')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager', 'recruiter')
    )
  );

CREATE POLICY "HR staff can delete job postings"
  ON job_postings
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
-- CANDIDATES - Optimize policies
-- ============================================================================

DROP POLICY IF EXISTS "HR staff can create candidates" ON candidates;
DROP POLICY IF EXISTS "HR staff can update candidates" ON candidates;
DROP POLICY IF EXISTS "HR staff can delete candidates" ON candidates;

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

CREATE POLICY "HR staff can update candidates"
  ON candidates
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager', 'recruiter')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager', 'recruiter')
    )
  );

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
-- APPLICATIONS - Optimize policies
-- ============================================================================

DROP POLICY IF EXISTS "HR staff can create applications" ON applications;
DROP POLICY IF EXISTS "HR staff can update applications" ON applications;
DROP POLICY IF EXISTS "HR staff can delete applications" ON applications;

CREATE POLICY "HR staff can create applications"
  ON applications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager', 'recruiter')
    )
  );

CREATE POLICY "HR staff can update applications"
  ON applications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager', 'recruiter')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager', 'recruiter')
    )
  );

CREATE POLICY "HR staff can delete applications"
  ON applications
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
-- SCREENING RESULTS - Optimize policies
-- ============================================================================

DROP POLICY IF EXISTS "HR staff can create screening results" ON screening_results;
DROP POLICY IF EXISTS "HR staff can update screening results" ON screening_results;

CREATE POLICY "HR staff can create screening results"
  ON screening_results
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager', 'recruiter')
    )
  );

CREATE POLICY "HR staff can update screening results"
  ON screening_results
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager', 'recruiter')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager', 'recruiter')
    )
  );

-- ============================================================================
-- COMPLIANCE AUDITS - Optimize policies
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view compliance audits" ON compliance_audits;
DROP POLICY IF EXISTS "Admins can create compliance audits" ON compliance_audits;
DROP POLICY IF EXISTS "Admins can update compliance audits" ON compliance_audits;

CREATE POLICY "Admins can view compliance audits"
  ON compliance_audits
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager')
    )
  );

CREATE POLICY "Admins can create compliance audits"
  ON compliance_audits
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager')
    )
  );

CREATE POLICY "Admins can update compliance audits"
  ON compliance_audits
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- ============================================================================
-- AUDIT LOGS - Optimize policies
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Authenticated users can create audit logs" ON audit_logs;

CREATE POLICY "Admins can view audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can create audit logs"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================================================
-- PRIVACY SETTINGS - Optimize policies
-- ============================================================================

DROP POLICY IF EXISTS "HR staff can view privacy settings" ON privacy_settings;
DROP POLICY IF EXISTS "HR staff can create privacy settings" ON privacy_settings;
DROP POLICY IF EXISTS "Admins can update privacy settings" ON privacy_settings;

CREATE POLICY "HR staff can view privacy settings"
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

CREATE POLICY "HR staff can create privacy settings"
  ON privacy_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager')
    )
  );

CREATE POLICY "Admins can update privacy settings"
  ON privacy_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- ============================================================================
-- ONBOARDING PLANS - Optimize policies
-- ============================================================================

DROP POLICY IF EXISTS "HR staff and managers can view onboarding plans" ON onboarding_plans;
DROP POLICY IF EXISTS "HR staff can create onboarding plans" ON onboarding_plans;
DROP POLICY IF EXISTS "HR staff and managers can update onboarding plans" ON onboarding_plans;

CREATE POLICY "HR staff and managers can view onboarding plans"
  ON onboarding_plans
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager', 'recruiter')
    )
    OR manager_id = (select auth.uid())
    OR employee_id = (select auth.uid())
  );

CREATE POLICY "HR staff can create onboarding plans"
  ON onboarding_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager')
    )
  );

CREATE POLICY "HR staff and managers can update onboarding plans"
  ON onboarding_plans
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager')
    )
    OR manager_id = (select auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager')
    )
    OR manager_id = (select auth.uid())
  );

-- ============================================================================
-- ONBOARDING TASKS - Optimize policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view relevant onboarding tasks" ON onboarding_tasks;
DROP POLICY IF EXISTS "HR staff and managers can create tasks" ON onboarding_tasks;
DROP POLICY IF EXISTS "Authorized users can update tasks" ON onboarding_tasks;

CREATE POLICY "Users can view relevant onboarding tasks"
  ON onboarding_tasks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM onboarding_plans op
      WHERE op.id = onboarding_plan_id
      AND (
        op.employee_id = (select auth.uid())
        OR op.manager_id = (select auth.uid())
        OR assigned_to = (select auth.uid())
        OR EXISTS (
          SELECT 1 FROM user_profiles
          WHERE id = (select auth.uid())
          AND role IN ('admin', 'hr_manager')
        )
      )
    )
  );

CREATE POLICY "HR staff and managers can create tasks"
  ON onboarding_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager')
    )
  );

CREATE POLICY "Authorized users can update tasks"
  ON onboarding_tasks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager')
    )
    OR assigned_to = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM onboarding_plans op
      WHERE op.id = onboarding_plan_id
      AND op.manager_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager')
    )
    OR assigned_to = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM onboarding_plans op
      WHERE op.id = onboarding_plan_id
      AND op.manager_id = (select auth.uid())
    )
  );

-- ============================================================================
-- TRAINING MODULES - Optimize policies
-- ============================================================================

DROP POLICY IF EXISTS "HR staff can create training modules" ON training_modules;
DROP POLICY IF EXISTS "HR staff can update training modules" ON training_modules;

CREATE POLICY "HR staff can create training modules"
  ON training_modules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager')
    )
  );

CREATE POLICY "HR staff can update training modules"
  ON training_modules
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager')
    )
  );

-- ============================================================================
-- TRAINING COMPLETIONS - Optimize policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view relevant training completions" ON training_completions;
DROP POLICY IF EXISTS "Users can create own training completions" ON training_completions;
DROP POLICY IF EXISTS "Users can update own training completions" ON training_completions;

CREATE POLICY "Users can view relevant training completions"
  ON training_completions
  FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager')
    )
  );

CREATE POLICY "Users can create own training completions"
  ON training_completions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own training completions"
  ON training_completions
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));
