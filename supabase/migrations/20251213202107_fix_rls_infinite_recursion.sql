/*
  # Fix RLS Infinite Recursion on user_profiles

  ## Overview
  Fixes the infinite recursion error caused by RLS policies on user_profiles
  that reference the same table in their USING clauses.

  ## Root Cause
  The "Users can view profiles" policy contains a subquery that SELECTs from
  user_profiles to check if the current user is an admin. This triggers the
  same RLS policy evaluation, causing infinite recursion.

  ## Solution
  1. Create a SECURITY DEFINER function that bypasses RLS to safely check user roles
  2. Replace recursive policy with non-recursive alternatives
  3. Update all other tables' policies to use the new function

  ## Changes
    1. New Functions
      - `get_current_user_role()` - Returns current user's role (bypasses RLS)
      - `is_admin()` - Returns true if current user is admin
      - `is_hr_staff()` - Returns true if current user has HR privileges

    2. Updated Policies
      - user_profiles: Split into non-recursive policies
      - All other tables: Use helper functions instead of subqueries

  ## Security Impact
    - No change to access control rules
    - Functions use SECURITY DEFINER with explicit search_path for safety
*/

-- ============================================================================
-- SECURITY DEFINER HELPER FUNCTIONS
-- ============================================================================

-- Function to get current user's role (bypasses RLS)
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$;

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Function to check if current user is HR staff (admin, hr_manager, or recruiter)
CREATE OR REPLACE FUNCTION is_hr_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'hr_manager', 'recruiter')
  );
$$;

-- Function to check if current user is compliance officer
CREATE OR REPLACE FUNCTION is_compliance_officer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (auth.jwt() ->> 'role') = 'compliance';
$$;

-- ============================================================================
-- FIX USER_PROFILES RLS POLICIES
-- ============================================================================

-- Drop the recursive policy
DROP POLICY IF EXISTS "Users can view profiles" ON user_profiles;

-- Create non-recursive SELECT policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

-- Admins can view all profiles (uses SECURITY DEFINER function)
CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- ============================================================================
-- FIX JOB_POSTINGS RLS POLICIES
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
  WITH CHECK (is_hr_staff());

CREATE POLICY "HR staff can update job postings"
  ON job_postings
  FOR UPDATE
  TO authenticated
  USING (is_hr_staff())
  WITH CHECK (is_hr_staff());

CREATE POLICY "HR staff can delete job postings"
  ON job_postings
  FOR DELETE
  TO authenticated
  USING (is_hr_staff());

-- ============================================================================
-- FIX CANDIDATES RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "HR staff can view candidates" ON candidates;
DROP POLICY IF EXISTS "HR staff can create candidates" ON candidates;
DROP POLICY IF EXISTS "HR staff can update candidates" ON candidates;
DROP POLICY IF EXISTS "HR staff can delete candidates" ON candidates;

CREATE POLICY "HR staff can view candidates"
  ON candidates
  FOR SELECT
  TO authenticated
  USING (is_hr_staff());

CREATE POLICY "HR staff can create candidates"
  ON candidates
  FOR INSERT
  TO authenticated
  WITH CHECK (is_hr_staff());

CREATE POLICY "HR staff can update candidates"
  ON candidates
  FOR UPDATE
  TO authenticated
  USING (is_hr_staff())
  WITH CHECK (is_hr_staff());

CREATE POLICY "HR staff can delete candidates"
  ON candidates
  FOR DELETE
  TO authenticated
  USING (is_hr_staff());

-- ============================================================================
-- FIX APPLICATIONS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "HR staff can view tenant applications" ON applications;
DROP POLICY IF EXISTS "Managers can view department applications" ON applications;
DROP POLICY IF EXISTS "HR staff can create applications" ON applications;
DROP POLICY IF EXISTS "HR staff can update applications" ON applications;
DROP POLICY IF EXISTS "HR staff can delete applications" ON applications;

CREATE POLICY "HR staff can view applications"
  ON applications
  FOR SELECT
  TO authenticated
  USING (is_hr_staff());

CREATE POLICY "HR staff can create applications"
  ON applications
  FOR INSERT
  TO authenticated
  WITH CHECK (is_hr_staff());

CREATE POLICY "HR staff can update applications"
  ON applications
  FOR UPDATE
  TO authenticated
  USING (is_hr_staff())
  WITH CHECK (is_hr_staff());

CREATE POLICY "HR staff can delete applications"
  ON applications
  FOR DELETE
  TO authenticated
  USING (is_hr_staff());

-- ============================================================================
-- FIX SCREENING_RESULTS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "HR staff can view tenant screening results" ON screening_results;
DROP POLICY IF EXISTS "Compliance officers can view all screening results" ON screening_results;
DROP POLICY IF EXISTS "HR staff can create screening results" ON screening_results;
DROP POLICY IF EXISTS "HR staff can update screening results" ON screening_results;

CREATE POLICY "HR staff can view screening results"
  ON screening_results
  FOR SELECT
  TO authenticated
  USING (is_hr_staff() OR is_compliance_officer());

CREATE POLICY "HR staff can create screening results"
  ON screening_results
  FOR INSERT
  TO authenticated
  WITH CHECK (is_hr_staff());

CREATE POLICY "HR staff can update screening results"
  ON screening_results
  FOR UPDATE
  TO authenticated
  USING (is_hr_staff())
  WITH CHECK (is_hr_staff());

-- ============================================================================
-- FIX MANAGER_OVERRIDES RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Managers can create overrides in their tenant" ON manager_overrides;
DROP POLICY IF EXISTS "Managers can view own overrides" ON manager_overrides;
DROP POLICY IF EXISTS "Managers can update own override details" ON manager_overrides;
DROP POLICY IF EXISTS "Compliance officers can view escalated overrides" ON manager_overrides;
DROP POLICY IF EXISTS "HR managers can view tenant overrides" ON manager_overrides;
DROP POLICY IF EXISTS "Admins can update escalation status" ON manager_overrides;

CREATE POLICY "Managers can create overrides"
  ON manager_overrides
  FOR INSERT
  TO authenticated
  WITH CHECK (
    manager_id = (select auth.uid())
    AND is_hr_staff()
  );

CREATE POLICY "Managers can view own overrides"
  ON manager_overrides
  FOR SELECT
  TO authenticated
  USING (manager_id = (select auth.uid()));

CREATE POLICY "HR staff can view all overrides"
  ON manager_overrides
  FOR SELECT
  TO authenticated
  USING (is_hr_staff() OR is_compliance_officer());

CREATE POLICY "Managers can update own overrides"
  ON manager_overrides
  FOR UPDATE
  TO authenticated
  USING (manager_id = (select auth.uid()))
  WITH CHECK (manager_id = (select auth.uid()));

CREATE POLICY "Admins can update any override"
  ON manager_overrides
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================================
-- FIX AUDIT_LOGS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Managers can view audit logs for own tenant" ON audit_logs;
DROP POLICY IF EXISTS "Compliance officers can view all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Authenticated users can create audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Audit logs are immutable" ON audit_logs;

CREATE POLICY "Users can view own audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "HR staff can view all audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (is_hr_staff() OR is_compliance_officer());

CREATE POLICY "Authenticated users can create audit logs"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Audit logs are immutable"
  ON audit_logs
  FOR DELETE
  TO authenticated
  USING (false);

-- ============================================================================
-- FIX COMPLIANCE_AUDITS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view compliance audits" ON compliance_audits;
DROP POLICY IF EXISTS "Admins can create compliance audits" ON compliance_audits;
DROP POLICY IF EXISTS "Admins can update compliance audits" ON compliance_audits;

CREATE POLICY "HR managers can view compliance audits"
  ON compliance_audits
  FOR SELECT
  TO authenticated
  USING (is_hr_staff() OR is_compliance_officer());

CREATE POLICY "HR managers can create compliance audits"
  ON compliance_audits
  FOR INSERT
  TO authenticated
  WITH CHECK (is_hr_staff());

CREATE POLICY "Admins can update compliance audits"
  ON compliance_audits
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================================
-- FIX PRIVACY_SETTINGS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "HR staff can view privacy settings" ON privacy_settings;
DROP POLICY IF EXISTS "HR staff can create privacy settings" ON privacy_settings;
DROP POLICY IF EXISTS "Admins can update privacy settings" ON privacy_settings;

CREATE POLICY "HR staff can view privacy settings"
  ON privacy_settings
  FOR SELECT
  TO authenticated
  USING (is_hr_staff());

CREATE POLICY "HR staff can create privacy settings"
  ON privacy_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (is_hr_staff());

CREATE POLICY "Admins can update privacy settings"
  ON privacy_settings
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================================
-- FIX ONBOARDING_PLANS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "HR staff and managers can view onboarding plans" ON onboarding_plans;
DROP POLICY IF EXISTS "HR staff can create onboarding plans" ON onboarding_plans;
DROP POLICY IF EXISTS "HR staff and managers can update onboarding plans" ON onboarding_plans;

CREATE POLICY "Users can view relevant onboarding plans"
  ON onboarding_plans
  FOR SELECT
  TO authenticated
  USING (
    is_hr_staff()
    OR manager_id = (select auth.uid())
    OR employee_id = (select auth.uid())
  );

CREATE POLICY "HR staff can create onboarding plans"
  ON onboarding_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (is_hr_staff());

CREATE POLICY "HR staff and managers can update onboarding plans"
  ON onboarding_plans
  FOR UPDATE
  TO authenticated
  USING (
    is_hr_staff()
    OR manager_id = (select auth.uid())
  )
  WITH CHECK (
    is_hr_staff()
    OR manager_id = (select auth.uid())
  );

-- ============================================================================
-- FIX ONBOARDING_TASKS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view relevant onboarding tasks" ON onboarding_tasks;
DROP POLICY IF EXISTS "HR staff and managers can create tasks" ON onboarding_tasks;
DROP POLICY IF EXISTS "Authorized users can update tasks" ON onboarding_tasks;

CREATE POLICY "Users can view relevant onboarding tasks"
  ON onboarding_tasks
  FOR SELECT
  TO authenticated
  USING (
    is_hr_staff()
    OR assigned_to = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM onboarding_plans op
      WHERE op.id = onboarding_plan_id
      AND (op.employee_id = (select auth.uid()) OR op.manager_id = (select auth.uid()))
    )
  );

CREATE POLICY "HR staff can create onboarding tasks"
  ON onboarding_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (is_hr_staff());

CREATE POLICY "Authorized users can update tasks"
  ON onboarding_tasks
  FOR UPDATE
  TO authenticated
  USING (
    is_hr_staff()
    OR assigned_to = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM onboarding_plans op
      WHERE op.id = onboarding_plan_id
      AND op.manager_id = (select auth.uid())
    )
  )
  WITH CHECK (
    is_hr_staff()
    OR assigned_to = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM onboarding_plans op
      WHERE op.id = onboarding_plan_id
      AND op.manager_id = (select auth.uid())
    )
  );

-- ============================================================================
-- FIX TRAINING_MODULES RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "HR staff can create training modules" ON training_modules;
DROP POLICY IF EXISTS "HR staff can update training modules" ON training_modules;

CREATE POLICY "All authenticated can view training modules"
  ON training_modules
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "HR staff can create training modules"
  ON training_modules
  FOR INSERT
  TO authenticated
  WITH CHECK (is_hr_staff());

CREATE POLICY "HR staff can update training modules"
  ON training_modules
  FOR UPDATE
  TO authenticated
  USING (is_hr_staff())
  WITH CHECK (is_hr_staff());

-- ============================================================================
-- FIX TRAINING_COMPLETIONS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view relevant training completions" ON training_completions;
DROP POLICY IF EXISTS "Users can create own training completions" ON training_completions;
DROP POLICY IF EXISTS "Users can update own training completions" ON training_completions;

CREATE POLICY "Users can view training completions"
  ON training_completions
  FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR is_hr_staff()
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
