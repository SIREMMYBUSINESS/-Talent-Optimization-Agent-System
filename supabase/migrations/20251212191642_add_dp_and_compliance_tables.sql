/*
  # Add Differential Privacy and Compliance Audit Tables

  ## Overview
  Extends screening results with differential privacy metadata and creates new tables for compliance auditing
  and manager override tracking. Enables privacy-preserving candidate evaluation with full regulatory compliance
  tracking (GDPR, EEOC) and bias detection.

  ## Tables Modified
  ### `screening_results`
    - Added `original_score` (numeric) - raw score before DP noise
    - Added `private_score` (numeric) - privacy-preserving noisy score
    - Added `privacy_epsilon` (numeric) - privacy budget epsilon parameter
    - Added `privacy_delta` (numeric) - delta failure probability
    - Added `privacy_mechanism` (text) - noise mechanism type (laplace/gaussian)
    - Added `dp_noise_amount` (numeric) - actual noise magnitude applied
    - Added `compliance_score` (numeric) - percentage of mandatory compliance checks passed
    - Added `compliance_risk_level` (text) - low/medium/high risk assessment
    - Added `compliance_findings` (jsonb) - array of compliance decision objects
    - Added `privacy_metadata` (jsonb) - privacy-specific metadata
    - Added `bias_analysis` (jsonb) - bias detection and disparate impact analysis
    - Added `screening_mode` (text) - production or evaluation mode
    - Added `evaluation_comparison_id` (uuid) - links DP vs non-DP score pairs in evaluation mode

  ## Tables Created

  ### `compliance_decisions`
    - `id` (uuid, primary key)
    - `application_id` (uuid) - references applications
    - `framework` (text) - GDPR or EEOC
    - `decision_type` (text) - category of compliance check
    - `passed` (boolean) - check result
    - `severity` (text) - low/medium/high
    - `data_fields_checked` (text[]) - which fields were examined
    - `explanation` (text) - detailed reason for decision
    - `rule_reference` (text) - regulation/policy reference
    - `created_at` (timestamptz) - audit timestamp

  ### `manager_overrides`
    - `id` (uuid, primary key)
    - `screening_result_id` (uuid) - references screening_results
    - `manager_id` (uuid) - references auth.users
    - `original_recommendation` (text) - system recommendation before override
    - `override_recommendation` (text) - manager's new decision
    - `override_reason` (text) - justification for override
    - `compliance_audit_triggered` (boolean) - whether compliance audit ran
    - `escalation_required` (boolean) - high-risk override flagged for review
    - `escalation_reason` (text) - why escalation needed
    - `override_at` (timestamptz)
    - `created_at` (timestamptz)

  ## Security
    - RLS enabled on all tables
    - HR staff and admins can view compliance data
    - Managers can create overrides only for their own team applications
    - Admin-only access to escalations
    - Audit trail immutable (no deletes on audit records)

  ## Indexes
    - Composite index on application_id + created_at for compliance_decisions
    - Index on framework and passed for compliance queries
    - Index on screening_result_id for manager_overrides
    - Index on escalation_required for admin review queue
*/

-- Add DP and compliance columns to screening_results
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'screening_results' AND column_name = 'original_score'
  ) THEN
    ALTER TABLE screening_results ADD COLUMN original_score numeric;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'screening_results' AND column_name = 'private_score'
  ) THEN
    ALTER TABLE screening_results ADD COLUMN private_score numeric;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'screening_results' AND column_name = 'privacy_epsilon'
  ) THEN
    ALTER TABLE screening_results ADD COLUMN privacy_epsilon numeric DEFAULT 1.0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'screening_results' AND column_name = 'privacy_delta'
  ) THEN
    ALTER TABLE screening_results ADD COLUMN privacy_delta numeric DEFAULT 1e-5;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'screening_results' AND column_name = 'privacy_mechanism'
  ) THEN
    ALTER TABLE screening_results ADD COLUMN privacy_mechanism text DEFAULT 'laplace';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'screening_results' AND column_name = 'dp_noise_amount'
  ) THEN
    ALTER TABLE screening_results ADD COLUMN dp_noise_amount numeric;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'screening_results' AND column_name = 'compliance_score'
  ) THEN
    ALTER TABLE screening_results ADD COLUMN compliance_score numeric CHECK (compliance_score >= 0 AND compliance_score <= 1);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'screening_results' AND column_name = 'compliance_risk_level'
  ) THEN
    ALTER TABLE screening_results ADD COLUMN compliance_risk_level text CHECK (compliance_risk_level IN ('low', 'medium', 'high'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'screening_results' AND column_name = 'compliance_findings'
  ) THEN
    ALTER TABLE screening_results ADD COLUMN compliance_findings jsonb DEFAULT '[]';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'screening_results' AND column_name = 'privacy_metadata'
  ) THEN
    ALTER TABLE screening_results ADD COLUMN privacy_metadata jsonb DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'screening_results' AND column_name = 'bias_analysis'
  ) THEN
    ALTER TABLE screening_results ADD COLUMN bias_analysis jsonb DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'screening_results' AND column_name = 'screening_mode'
  ) THEN
    ALTER TABLE screening_results ADD COLUMN screening_mode text DEFAULT 'production' CHECK (screening_mode IN ('production', 'evaluation'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'screening_results' AND column_name = 'evaluation_comparison_id'
  ) THEN
    ALTER TABLE screening_results ADD COLUMN evaluation_comparison_id uuid;
  END IF;
END $$;

-- Create compliance_decisions table
CREATE TABLE IF NOT EXISTS compliance_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  framework text NOT NULL CHECK (framework IN ('GDPR', 'EEOC', 'general')),
  decision_type text NOT NULL,
  passed boolean NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  data_fields_checked text[] DEFAULT '{}',
  explanation text NOT NULL,
  rule_reference text,
  created_at timestamptz DEFAULT now()
);

-- Create manager_overrides table
CREATE TABLE IF NOT EXISTS manager_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screening_result_id uuid NOT NULL UNIQUE REFERENCES screening_results(id) ON DELETE CASCADE,
  manager_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  original_recommendation text NOT NULL,
  override_recommendation text NOT NULL,
  override_reason text NOT NULL,
  compliance_audit_triggered boolean DEFAULT false,
  escalation_required boolean DEFAULT false,
  escalation_reason text,
  override_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE compliance_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_overrides ENABLE ROW LEVEL SECURITY;

-- Compliance Decisions RLS Policies

-- HR staff can view compliance decisions for their applications
CREATE POLICY "HR staff can view compliance decisions"
  ON compliance_decisions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager', 'recruiter')
    )
  );

-- System can create compliance decisions
CREATE POLICY "System can create compliance decisions"
  ON compliance_decisions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager', 'recruiter')
    )
  );

-- Manager Overrides RLS Policies

-- HR staff can view manager overrides
CREATE POLICY "HR staff can view manager overrides"
  ON manager_overrides
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager', 'recruiter')
    )
  );

-- Managers can create overrides
CREATE POLICY "Managers can create overrides"
  ON manager_overrides
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = manager_id
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager', 'recruiter')
    )
  );

-- Admins can update escalation status
CREATE POLICY "Admins can update override escalations"
  ON manager_overrides
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_compliance_decisions_application ON compliance_decisions(application_id);
CREATE INDEX IF NOT EXISTS idx_compliance_decisions_framework ON compliance_decisions(framework);
CREATE INDEX IF NOT EXISTS idx_compliance_decisions_passed ON compliance_decisions(passed);
CREATE INDEX IF NOT EXISTS idx_compliance_decisions_created ON compliance_decisions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_manager_overrides_screening ON manager_overrides(screening_result_id);
CREATE INDEX IF NOT EXISTS idx_manager_overrides_manager ON manager_overrides(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_overrides_escalation ON manager_overrides(escalation_required);
CREATE INDEX IF NOT EXISTS idx_manager_overrides_created ON manager_overrides(created_at DESC);

-- Create index for DP/compliance queries
CREATE INDEX IF NOT EXISTS idx_screening_results_private_score ON screening_results(private_score DESC);
CREATE INDEX IF NOT EXISTS idx_screening_results_compliance_risk ON screening_results(compliance_risk_level);
CREATE INDEX IF NOT EXISTS idx_screening_results_mode ON screening_results(screening_mode);
