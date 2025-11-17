/*
  # Create Compliance and Audit Tables

  ## Overview
  Creates tables for tracking compliance audits, bias detection, and system audit logs
  to ensure fair hiring practices and regulatory compliance.

  ## Tables Created
    
  ### `compliance_audits`
    - `id` (uuid, primary key) - unique audit identifier
    - `application_id` (uuid) - references applications being audited
    - `audit_type` (text) - bias_check, privacy_check, regulatory_compliance
    - `status` (text) - passed, flagged, failed
    - `findings` (jsonb) - detailed audit findings
    - `risk_level` (text) - low, medium, high, critical
    - `remediation_required` (boolean) - whether action is needed
    - `remediation_notes` (text) - suggested actions
    - `audited_by` (text) - system or user identifier
    - `audited_at` (timestamptz) - audit timestamp
    - `created_at` (timestamptz) - record creation

  ### `audit_logs`
    - `id` (uuid, primary key) - unique log entry identifier
    - `user_id` (uuid) - user who performed action
    - `action` (text) - action performed
    - `resource_type` (text) - type of resource affected
    - `resource_id` (uuid) - specific resource identifier
    - `metadata` (jsonb) - additional context data
    - `ip_address` (text) - user's IP address
    - `user_agent` (text) - browser/client information
    - `created_at` (timestamptz) - log entry timestamp

  ### `privacy_settings`
    - `id` (uuid, primary key) - unique setting identifier
    - `candidate_id` (uuid, required) - references candidates
    - `data_retention_days` (integer) - how long to keep data
    - `anonymize_after_days` (integer) - when to anonymize data
    - `consent_given` (boolean) - whether candidate consented
    - `consent_date` (timestamptz) - when consent was given
    - `pii_masked` (boolean) - whether PII is masked
    - `created_at` (timestamptz) - record creation
    - `updated_at` (timestamptz) - last update

  ## Security
    - Enable RLS on all tables
    - Only admins and compliance officers can view audits
    - Audit logs are append-only
    - Privacy settings can only be modified by authorized personnel

  ## Indexes
    - Index on audit_type and status for filtering
    - Index on created_at for time-based queries
    - Index on resource_type and resource_id for audit log lookups
*/

-- Create compliance_audits table
CREATE TABLE IF NOT EXISTS compliance_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES applications(id) ON DELETE SET NULL,
  audit_type text NOT NULL CHECK (audit_type IN ('bias_check', 'privacy_check', 'regulatory_compliance', 'data_retention', 'access_control')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'passed', 'flagged', 'failed')),
  findings jsonb DEFAULT '{}',
  risk_level text DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  remediation_required boolean DEFAULT false,
  remediation_notes text,
  audited_by text DEFAULT 'system',
  audited_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  metadata jsonb DEFAULT '{}',
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create privacy_settings table
CREATE TABLE IF NOT EXISTS privacy_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL UNIQUE REFERENCES candidates(id) ON DELETE CASCADE,
  data_retention_days integer DEFAULT 365,
  anonymize_after_days integer DEFAULT 730,
  consent_given boolean DEFAULT false,
  consent_date timestamptz,
  pii_masked boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE compliance_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_settings ENABLE ROW LEVEL SECURITY;
alter table public.applications enable row level security;

-- Allow read for any authenticated user
create policy applications_read_authenticated
on public.applications
for select
to authenticated
using (true);


-- Compliance Audits Policies

-- Only admins and HR managers can view compliance audits
CREATE POLICY "Admins can view compliance audits"
  ON compliance_audits
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'hr_manager')
    )
  );
create policy applications_insert_authenticated
on public.applications
for insert
to authenticated
with check (true);

-- Only system/admins can create compliance audits
CREATE POLICY "Admins can create compliance audits"
  ON compliance_audits
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'hr_manager')
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
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Audit Logs Policies (Read-only for most users, append-only)

-- Admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- All authenticated users can create audit logs
CREATE POLICY "Authenticated users can create audit logs"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Privacy Settings Policies

-- HR staff can view privacy settings
CREATE POLICY "HR staff can view privacy settings"
  ON privacy_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
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
      WHERE id = auth.uid() 
      AND role IN ('admin', 'hr_manager')
    )
  );

-- Only admins can update privacy settings
CREATE POLICY "Admins can update privacy settings"
  ON privacy_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_compliance_audits_type ON compliance_audits(audit_type);
CREATE INDEX IF NOT EXISTS idx_compliance_audits_status ON compliance_audits(status);
CREATE INDEX IF NOT EXISTS idx_compliance_audits_risk_level ON compliance_audits(risk_level);
CREATE INDEX IF NOT EXISTS idx_compliance_audits_created_at ON compliance_audits(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_privacy_settings_candidate ON privacy_settings(candidate_id);

-- Create trigger for privacy_settings updated_at
CREATE TRIGGER update_privacy_settings_updated_at
  BEFORE UPDATE ON privacy_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
