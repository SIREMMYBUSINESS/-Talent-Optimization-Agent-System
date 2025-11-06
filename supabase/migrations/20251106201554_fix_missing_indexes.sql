/*
  # Fix Missing Foreign Key Indexes

  ## Overview
  Adds missing indexes on foreign key columns to improve query performance.
  Foreign keys without indexes can cause slow queries when joining tables.

  ## Indexes Added
    - `idx_applications_reviewed_by` on applications(reviewed_by)
    - `idx_compliance_audits_application_id` on compliance_audits(application_id)
    - `idx_job_postings_posted_by` on job_postings(posted_by)
    - `idx_onboarding_plans_candidate_id` on onboarding_plans(candidate_id)
    - `idx_onboarding_tasks_completed_by` on onboarding_tasks(completed_by)

  ## Performance Impact
    - Faster joins and lookups on foreign key relationships
    - Improved query execution times for related data
*/

-- Add missing foreign key indexes
CREATE INDEX IF NOT EXISTS idx_applications_reviewed_by ON applications(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_compliance_audits_application_id ON compliance_audits(application_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_posted_by ON job_postings(posted_by);
CREATE INDEX IF NOT EXISTS idx_onboarding_plans_candidate_id ON onboarding_plans(candidate_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_completed_by ON onboarding_tasks(completed_by);
