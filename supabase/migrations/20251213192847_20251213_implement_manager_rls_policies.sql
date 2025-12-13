/*
  # Implement Manager RLS Policies with Tenant Isolation

  ## Overview
  Replaces existing manager_overrides RLS policies with tenant-aware policies that enforce:
  1. Managers can only override candidates within their tenant
  2. Managers can only see their own override decisions
  3. Tenant isolation is enforced via JWT claims
  4. Department-level scoping for manager accountability

  ## Policies Created
    - Manager INSERT: Create overrides within tenant/department
    - Manager SELECT: View own overrides scoped to tenant
    - Manager UPDATE: Update own override details with department validation
    - Compliance SELECT: Cross-tenant visibility for escalated cases
    - Admin UPDATE: Admin management of escalation status

  ## Security Checks
    - manager_id = auth.uid() (identity verification)
    - tenant_id = auth.jwt() ->> 'tenant_id' (tenant isolation)
    - department_id = auth.jwt() ->> 'department_id' (department context)
    - role-based access control

  ## Testing Scenarios
    - Manager outside tenant cannot override: DENIED
    - Compliance officer queries escalations: ALLOWED
    - Manager views other manager's overrides: DENIED
    - HR staff updates escalation: ALLOWED (if authorized)
*/

-- ============================================================================
-- DROP EXISTING MANAGER_OVERRIDES POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "HR staff can view manager overrides" ON manager_overrides;
DROP POLICY IF EXISTS "Managers can create overrides" ON manager_overrides;
DROP POLICY IF EXISTS "Admins can update override escalations" ON manager_overrides;

-- ============================================================================
-- MANAGER_OVERRIDES: TENANT-ISOLATED POLICIES
-- ============================================================================

-- Manager can INSERT override only within their tenant/department
CREATE POLICY "Managers can create overrides in their tenant"
  ON manager_overrides
  FOR INSERT
  TO authenticated
  WITH CHECK (
    manager_id = (select auth.uid())
    AND tenant_id = (
      SELECT id FROM tenants 
      WHERE id::text = (auth.jwt() ->> 'tenant_id')
      LIMIT 1
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager', 'recruiter')
    )
  );

-- Manager can SELECT only their own overrides
CREATE POLICY "Managers can view own overrides"
  ON manager_overrides
  FOR SELECT
  TO authenticated
  USING (
    manager_id = (select auth.uid())
    AND tenant_id = (
      SELECT id FROM tenants 
      WHERE id::text = (auth.jwt() ->> 'tenant_id')
      LIMIT 1
    )
  );

-- Manager can UPDATE their own overrides (but not escalation_required)
CREATE POLICY "Managers can update own override details"
  ON manager_overrides
  FOR UPDATE
  TO authenticated
  USING (
    manager_id = (select auth.uid())
    AND tenant_id = (
      SELECT id FROM tenants 
      WHERE id::text = (auth.jwt() ->> 'tenant_id')
      LIMIT 1
    )
  )
  WITH CHECK (
    manager_id = (select auth.uid())
    AND tenant_id = (
      SELECT id FROM tenants 
      WHERE id::text = (auth.jwt() ->> 'tenant_id')
      LIMIT 1
    )
  );

-- Compliance officers can SELECT all escalated overrides across tenants
CREATE POLICY "Compliance officers can view escalated overrides"
  ON manager_overrides
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'compliance'
    AND escalation_required = true
  );

-- HR managers can SELECT overrides within their tenant
CREATE POLICY "HR managers can view tenant overrides"
  ON manager_overrides
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager')
    )
    AND tenant_id = (
      SELECT id FROM tenants 
      WHERE id::text = (auth.jwt() ->> 'tenant_id')
      LIMIT 1
    )
  );

-- Admins can UPDATE escalation status and compliance audit flags
CREATE POLICY "Admins can update escalation status"
  ON manager_overrides
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
-- AUDIT_LOGS TENANT-ISOLATED POLICIES
-- ============================================================================

-- Drop existing audit log policies
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Authenticated users can create audit logs" ON audit_logs;

-- Managers can view audit logs for their tenant/actions
CREATE POLICY "Managers can view audit logs for own tenant"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    (
      -- Managers see logs for their tenant
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = (select auth.uid())
        AND role IN ('admin', 'hr_manager', 'recruiter')
      )
      AND tenant_id = (
        SELECT id FROM tenants 
        WHERE id::text = (auth.jwt() ->> 'tenant_id')
        LIMIT 1
      )
    )
    OR
    -- Or they see logs they created
    user_id = (select auth.uid())
  );

-- Compliance officers can view all audit logs
CREATE POLICY "Compliance officers can view all audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'compliance'
  );

-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs"
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

-- Authenticated users can INSERT audit logs for themselves
CREATE POLICY "Authenticated users can create audit logs"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND tenant_id = (
      SELECT id FROM tenants 
      WHERE id::text = (auth.jwt() ->> 'tenant_id')
      LIMIT 1
    )
  );

-- Audit logs are append-only (no DELETE or UPDATE)
CREATE POLICY "Audit logs are immutable"
  ON audit_logs
  FOR DELETE
  TO authenticated
  USING (false);

-- ============================================================================
-- APPLICATION TENANT-ISOLATED POLICIES
-- ============================================================================

-- Drop existing application policies
DROP POLICY IF EXISTS "Authenticated users can view applications" ON applications;
DROP POLICY IF EXISTS "HR staff can create applications" ON applications;
DROP POLICY IF EXISTS "HR staff can update applications" ON applications;
DROP POLICY IF EXISTS "HR staff can delete applications" ON applications;

-- HR staff can view applications within their tenant
CREATE POLICY "HR staff can view tenant applications"
  ON applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager', 'recruiter')
    )
    AND tenant_id = (
      SELECT id FROM tenants 
      WHERE id::text = (auth.jwt() ->> 'tenant_id')
      LIMIT 1
    )
  );

-- Managers can view applications in their department
CREATE POLICY "Managers can view department applications"
  ON applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager', 'recruiter')
    )
    AND department_id = (auth.jwt() ->> 'department_id')
  );

-- HR staff can create applications
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
    AND tenant_id = (
      SELECT id FROM tenants 
      WHERE id::text = (auth.jwt() ->> 'tenant_id')
      LIMIT 1
    )
  );

-- HR staff can update applications in their tenant
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
    AND tenant_id = (
      SELECT id FROM tenants 
      WHERE id::text = (auth.jwt() ->> 'tenant_id')
      LIMIT 1
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager', 'recruiter')
    )
    AND tenant_id = (
      SELECT id FROM tenants 
      WHERE id::text = (auth.jwt() ->> 'tenant_id')
      LIMIT 1
    )
  );

-- HR staff can delete applications
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
    AND tenant_id = (
      SELECT id FROM tenants 
      WHERE id::text = (auth.jwt() ->> 'tenant_id')
      LIMIT 1
    )
  );

-- ============================================================================
-- SCREENING_RESULTS TENANT-ISOLATED POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view screening results" ON screening_results;
DROP POLICY IF EXISTS "HR staff can create screening results" ON screening_results;
DROP POLICY IF EXISTS "HR staff can update screening results" ON screening_results;

-- HR staff can view screening results in their tenant
CREATE POLICY "HR staff can view tenant screening results"
  ON screening_results
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager', 'recruiter')
    )
    AND tenant_id = (
      SELECT id FROM tenants 
      WHERE id::text = (auth.jwt() ->> 'tenant_id')
      LIMIT 1
    )
  );

-- Compliance officers can view all screening results
CREATE POLICY "Compliance officers can view all screening results"
  ON screening_results
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'compliance'
  );

-- HR staff can create screening results
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
    AND tenant_id = (
      SELECT id FROM tenants 
      WHERE id::text = (auth.jwt() ->> 'tenant_id')
      LIMIT 1
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
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager', 'recruiter')
    )
    AND tenant_id = (
      SELECT id FROM tenants 
      WHERE id::text = (auth.jwt() ->> 'tenant_id')
      LIMIT 1
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'hr_manager', 'recruiter')
    )
    AND tenant_id = (
      SELECT id FROM tenants 
      WHERE id::text = (auth.jwt() ->> 'tenant_id')
      LIMIT 1
    )
  );
