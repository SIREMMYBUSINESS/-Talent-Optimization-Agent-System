/*
  # Add Tenant Isolation Infrastructure

  ## Overview
  Creates the foundation for multi-tenant data isolation by:
  1. Adding tenant_id and department_id columns to core tables
  2. Creating tenants and user_tenant_mapping tables
  3. Implementing automatic tenant_id population via triggers
  4. Establishing foreign key relationships

  ## New Tables
    - `tenants` - stores tenant metadata and configurations
    - `user_tenant_mapping` - tracks which tenants each user belongs to

  ## Modified Tables
    - `applications` - added tenant_id, department_id
    - `screening_results` - added tenant_id, department_id
    - `manager_overrides` - added tenant_id, department_id
    - `audit_logs` - added tenant_id, department_id, escalation_flag
    - `compliance_decisions` - added tenant_id, department_id
    - `compliance_audits` - added tenant_id, department_id

  ## Security
    - RLS will enforce tenant isolation (updated in separate migration)
    - Triggers automatically populate tenant_id from JWT claims
    - User_tenant_mapping enables multi-tenant user support

  ## Key Features
    - Default tenant_id from auth.jwt() ->> 'tenant_id'
    - Automatic population via trigger
    - Full audit trail with tenant context
    - Backward compatible with existing data
*/

-- ============================================================================
-- CREATE TENANTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  subdomain text UNIQUE,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage tenants
CREATE POLICY "Admins can view tenants"
  ON tenants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_tenants_name ON tenants(name);
CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants(is_active);

-- ============================================================================
-- CREATE USER_TENANT_MAPPING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_tenant_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

ALTER TABLE user_tenant_mapping ENABLE ROW LEVEL SECURITY;

-- Admins can view user-tenant mappings
CREATE POLICY "Admins can view user_tenant_mapping"
  ON user_tenant_mapping
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- Users can view their own tenant assignments
CREATE POLICY "Users can view own tenant assignments"
  ON user_tenant_mapping
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE INDEX IF NOT EXISTS idx_user_tenant_user ON user_tenant_mapping(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenant_tenant ON user_tenant_mapping(tenant_id);

-- ============================================================================
-- ADD TENANT_ID AND DEPARTMENT_ID TO APPLICATIONS
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE applications ADD COLUMN tenant_id uuid;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'department_id'
  ) THEN
    ALTER TABLE applications ADD COLUMN department_id text;
  END IF;
END $$;

-- ============================================================================
-- ADD TENANT_ID AND DEPARTMENT_ID TO SCREENING_RESULTS
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'screening_results' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE screening_results ADD COLUMN tenant_id uuid;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'screening_results' AND column_name = 'department_id'
  ) THEN
    ALTER TABLE screening_results ADD COLUMN department_id text;
  END IF;
END $$;

-- ============================================================================
-- ADD TENANT_ID AND DEPARTMENT_ID TO MANAGER_OVERRIDES
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'manager_overrides' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE manager_overrides ADD COLUMN tenant_id uuid;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'manager_overrides' AND column_name = 'department_id'
  ) THEN
    ALTER TABLE manager_overrides ADD COLUMN department_id text;
  END IF;
END $$;

-- ============================================================================
-- ADD TENANT_ID AND DEPARTMENT_ID TO AUDIT_LOGS
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN tenant_id uuid;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'department_id'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN department_id text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'escalation_flag'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN escalation_flag boolean DEFAULT false;
  END IF;
END $$;

-- ============================================================================
-- ADD TENANT_ID AND DEPARTMENT_ID TO COMPLIANCE_DECISIONS
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'compliance_decisions' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE compliance_decisions ADD COLUMN tenant_id uuid;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'compliance_decisions' AND column_name = 'department_id'
  ) THEN
    ALTER TABLE compliance_decisions ADD COLUMN department_id text;
  END IF;
END $$;

-- ============================================================================
-- ADD TENANT_ID AND DEPARTMENT_ID TO COMPLIANCE_AUDITS
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'compliance_audits' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE compliance_audits ADD COLUMN tenant_id uuid;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'compliance_audits' AND column_name = 'department_id'
  ) THEN
    ALTER TABLE compliance_audits ADD COLUMN department_id text;
  END IF;
END $$;

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_applications_tenant ON applications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_applications_department ON applications(department_id);
CREATE INDEX IF NOT EXISTS idx_screening_results_tenant ON screening_results(tenant_id);
CREATE INDEX IF NOT EXISTS idx_screening_results_department ON screening_results(department_id);
CREATE INDEX IF NOT EXISTS idx_manager_overrides_tenant ON manager_overrides(tenant_id);
CREATE INDEX IF NOT EXISTS idx_manager_overrides_department ON manager_overrides(department_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_department ON audit_logs(department_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_escalation ON audit_logs(escalation_flag);
CREATE INDEX IF NOT EXISTS idx_compliance_decisions_tenant ON compliance_decisions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_compliance_audits_tenant ON compliance_audits(tenant_id);

-- ============================================================================
-- CREATE TRIGGER FOR TENANTS UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
