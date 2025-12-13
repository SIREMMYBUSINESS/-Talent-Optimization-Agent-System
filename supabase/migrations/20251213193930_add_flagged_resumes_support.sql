/*
  # Add Flagged Resumes Support

  1. New Columns
    - `flagged` (boolean): Whether the application has compliance flags
    - `compliance_flags` (jsonb): Detailed flag information including type, reason, and severity

  2. Changes to applications table
    - Add `flagged` column with default false
    - Add `compliance_flags` column to store detailed flag data
    - Create index on flagged column for query performance

  3. Security
    - Existing RLS policies remain in effect
    - Candidates cannot view flagged status of their own applications per compliance RLS policies
    - Compliance officers can view all flagged applications within their tenant scope

  4. Notes
    - Migration is backwards compatible (all applications default to unflagged)
    - compliance_flags stores structured data like: {type: "bias_detected", severity: "high", reason: "..."}
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'flagged'
  ) THEN
    ALTER TABLE applications ADD COLUMN flagged boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'compliance_flags'
  ) THEN
    ALTER TABLE applications ADD COLUMN compliance_flags jsonb;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_applications_flagged ON applications(flagged);
CREATE INDEX IF NOT EXISTS idx_applications_flagged_tenant ON applications(tenant_id, flagged);
