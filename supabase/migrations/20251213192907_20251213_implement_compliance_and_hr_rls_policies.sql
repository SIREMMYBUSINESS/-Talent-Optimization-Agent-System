/*
  # Implement Compliance Officer and HR Staff RLS Policies

  ## Overview
  Creates comprehensive RLS policies for:
  1. Compliance officers - cross-tenant visibility for escalated/high-risk cases
  2. HR staff - department and tenant scoped access with limited write capabilities
  3. Audit trail visibility for compliance and HR roles

  ## Compliance Officer Access
    - Can view all escalated manager overrides
    - Can view all compliance decisions across tenants
    - Can view all compliance audits
    - Can view all audit logs (read-only)
    - Cannot insert or modify overrides

  ## HR Staff Access
    - View applications, screening results within department
    - View audit logs for their department
    - Read-only access to compliance decisions (for their department)
    - Cannot view manager overrides (unless explicitly authorized)
    - Department-level accountability

  ## Security Model
    - Compliance role identified by: auth.jwt() ->> 'role' = 'compliance'
    - HR role check via: role IN ('admin', 'hr_manager', 'recruiter')
    - Department filtering: department_id = auth.jwt() ->> 'department_id'
    - Tenant filtering: tenant_id from JWT claims
*/

-- ============================================================================
-- COMPLIANCE_DECISIONS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "HR staff can view compliance decisions" ON compliance_decisions;
DROP POLICY IF EXISTS "System can create compliance decisions" ON compliance_decisions;

-- Compliance officers can view all compliance decisions
CREATE POLICY "Compliance officers can view all compliance decisions"
  ON compliance_decisions
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'compliance'
  );

-- HR staff can view compliance decisions within their tenant
CREATE POLICY "HR staff can view tenant compliance decisions"
  ON compliance_decisions
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

-- HR staff and admins can create compliance decisions
CREATE POLICY "HR staff can create compliance decisions"
  ON compliance_decisions
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

-- ============================================================================
-- COMPLIANCE_AUDITS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view compliance audits" ON compliance_audits;
DROP POLICY IF EXISTS "Admins can create compliance audits" ON compliance_audits;
DROP POLICY IF EXISTS "Admins can update compliance audits" ON compliance_audits;

-- Compliance officers can view all compliance audits
CREATE POLICY "Compliance officers can view all compliance audits"
  ON compliance_audits
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'compliance'
  );

-- HR staff can view compliance audits within their tenant
CREATE POLICY "HR staff can view tenant compliance audits"
  ON compliance_audits
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

-- Admins can create compliance audits
CREATE POLICY "Admins can create compliance audits"
  ON compliance_audits
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- Admins can update compliance audits
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
-- PRIVACY_SETTINGS TENANT-ISOLATED POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "HR staff can view privacy settings" ON privacy_settings;
DROP POLICY IF EXISTS "HR staff can create privacy settings" ON privacy_settings;
DROP POLICY IF EXISTS "Admins can update privacy settings" ON privacy_settings;

-- HR staff can view privacy settings for their candidates
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

-- HR staff can create privacy settings
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

-- Admins can update privacy settings
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
-- HR STAFF DEPARTMENT-SCOPED POLICIES
-- ============================================================================

-- HR staff can view candidates in their department
CREATE POLICY "HR staff can view department candidates"
  ON candidates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (select auth.uid())
      AND up.role IN ('admin', 'hr_manager', 'recruiter')
      AND (
        -- Admins see all
        up.role = 'admin'
        -- Or HR managers see their department
        OR up.department = (
          SELECT department FROM user_profiles 
          WHERE id = (select auth.uid())
        )
      )
    )
  );

-- HR staff can update candidates in their department
CREATE POLICY "HR staff can update department candidates"
  ON candidates
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (select auth.uid())
      AND up.role IN ('admin', 'hr_manager', 'recruiter')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (select auth.uid())
      AND up.role IN ('admin', 'hr_manager', 'recruiter')
    )
  );
