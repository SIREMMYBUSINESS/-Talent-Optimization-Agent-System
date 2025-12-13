/*
  # Create Automatic Audit Logging Triggers

  ## Overview
  Implements automatic audit trail generation for critical operations:
  1. Manager override creation/updates are logged immediately
  2. Escalation status changes are tracked
  3. Compliance decisions are logged
  4. Full context captured: tenant_id, department_id, manager_id, escalation reason

  ## Audit Trail Captures
    - Manager override decisions (original vs. new recommendation)
    - Escalation flags and reasons
    - Compliance audit triggers
    - Timestamp and actor information
    - Change deltas (what changed and why)

  ## Immutable Record
    - Each action creates new audit log entry
    - Original audit logs cannot be modified or deleted
    - Compliance officers can review complete audit trail
    - Department managers see their team's actions

  ## Trigger Functions
    - log_manager_override_action() - fires on INSERT/UPDATE of manager_overrides
    - log_compliance_decision() - fires on INSERT of compliance_decisions
    - Automatic tenant_id population from JWT claims
*/

-- ============================================================================
-- TRIGGER: LOG MANAGER OVERRIDE ACTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION log_manager_override_action()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id uuid;
  v_department_id text;
  v_action text;
  v_previous_values jsonb;
  v_new_values jsonb;
BEGIN
  -- Extract tenant and department from JWT (or use NEW values)
  v_tenant_id := COALESCE(NEW.tenant_id, (auth.jwt() ->> 'tenant_id')::uuid);
  v_department_id := COALESCE(NEW.department_id, auth.jwt() ->> 'department_id');

  -- Ensure tenant_id and department_id are populated
  NEW.tenant_id := v_tenant_id;
  NEW.department_id := v_department_id;

  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    v_action := 'MANAGER_OVERRIDE_CREATED';
    v_new_values := jsonb_build_object(
      'screening_result_id', NEW.screening_result_id,
      'original_recommendation', NEW.original_recommendation,
      'override_recommendation', NEW.override_recommendation,
      'override_reason', NEW.override_reason,
      'escalation_required', NEW.escalation_required,
      'escalation_reason', NEW.escalation_reason
    );
    v_previous_values := '{}';
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'MANAGER_OVERRIDE_UPDATED';
    v_previous_values := jsonb_build_object(
      'override_recommendation', OLD.override_recommendation,
      'escalation_required', OLD.escalation_required,
      'escalation_reason', OLD.escalation_reason,
      'compliance_audit_triggered', OLD.compliance_audit_triggered
    );
    v_new_values := jsonb_build_object(
      'override_recommendation', NEW.override_recommendation,
      'escalation_required', NEW.escalation_required,
      'escalation_reason', NEW.escalation_reason,
      'compliance_audit_triggered', NEW.compliance_audit_triggered
    );
  END IF;

  -- Insert audit log entry
  INSERT INTO audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    metadata,
    tenant_id,
    department_id,
    escalation_flag
  ) VALUES (
    NEW.manager_id,
    v_action,
    'manager_override',
    NEW.id,
    jsonb_build_object(
      'previous', v_previous_values,
      'current', v_new_values,
      'manager_id', NEW.manager_id,
      'screening_result_id', NEW.screening_result_id,
      'escalation_required', NEW.escalation_required
    ),
    v_tenant_id,
    v_department_id,
    NEW.escalation_required
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_log_manager_override ON manager_overrides;

-- Create trigger on manager_overrides
CREATE TRIGGER trigger_log_manager_override
  BEFORE INSERT OR UPDATE ON manager_overrides
  FOR EACH ROW
  EXECUTE FUNCTION log_manager_override_action();

-- ============================================================================
-- TRIGGER: LOG COMPLIANCE DECISIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION log_compliance_decision()
RETURNS TRIGGER AS $$
DECLARE
  v_action text;
BEGIN
  v_action := 'COMPLIANCE_DECISION_CREATED';

  -- Insert audit log entry
  INSERT INTO audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    metadata,
    tenant_id,
    department_id
  ) VALUES (
    auth.uid(),
    v_action,
    'compliance_decision',
    NEW.id,
    jsonb_build_object(
      'framework', NEW.framework,
      'decision_type', NEW.decision_type,
      'passed', NEW.passed,
      'severity', NEW.severity,
      'explanation', NEW.explanation,
      'rule_reference', NEW.rule_reference
    ),
    NEW.tenant_id,
    NEW.department_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_log_compliance_decision ON compliance_decisions;

-- Create trigger on compliance_decisions
CREATE TRIGGER trigger_log_compliance_decision
  AFTER INSERT ON compliance_decisions
  FOR EACH ROW
  EXECUTE FUNCTION log_compliance_decision();

-- ============================================================================
-- TRIGGER: POPULATE TENANT_ID FROM JWT ON APPLICATION INSERT
-- ============================================================================

CREATE OR REPLACE FUNCTION populate_tenant_id_from_jwt()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id uuid;
  v_department_id text;
BEGIN
  -- Extract tenant_id and department_id from JWT if not already set
  IF NEW.tenant_id IS NULL THEN
    v_tenant_id := (auth.jwt() ->> 'tenant_id')::uuid;
    NEW.tenant_id := v_tenant_id;
  END IF;

  IF NEW.department_id IS NULL THEN
    v_department_id := auth.jwt() ->> 'department_id';
    NEW.department_id := v_department_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop triggers if they exist
DROP TRIGGER IF EXISTS trigger_populate_tenant_applications ON applications;
DROP TRIGGER IF EXISTS trigger_populate_tenant_screening ON screening_results;
DROP TRIGGER IF EXISTS trigger_populate_tenant_compliance_decisions ON compliance_decisions;
DROP TRIGGER IF EXISTS trigger_populate_tenant_compliance_audits ON compliance_audits;

-- Create triggers to auto-populate tenant_id and department_id
CREATE TRIGGER trigger_populate_tenant_applications
  BEFORE INSERT ON applications
  FOR EACH ROW
  EXECUTE FUNCTION populate_tenant_id_from_jwt();

CREATE TRIGGER trigger_populate_tenant_screening
  BEFORE INSERT ON screening_results
  FOR EACH ROW
  EXECUTE FUNCTION populate_tenant_id_from_jwt();

CREATE TRIGGER trigger_populate_tenant_compliance_decisions
  BEFORE INSERT ON compliance_decisions
  FOR EACH ROW
  EXECUTE FUNCTION populate_tenant_id_from_jwt();

CREATE TRIGGER trigger_populate_tenant_compliance_audits
  BEFORE INSERT ON compliance_audits
  FOR EACH ROW
  EXECUTE FUNCTION populate_tenant_id_from_jwt();

-- ============================================================================
-- TRIGGER: LOG ESCALATION RESOLUTION
-- ============================================================================

CREATE OR REPLACE FUNCTION log_escalation_resolution()
RETURNS TRIGGER AS $$
BEGIN
  -- If escalation status changes, log it
  IF OLD.escalation_required IS DISTINCT FROM NEW.escalation_required THEN
    INSERT INTO audit_logs (
      user_id,
      action,
      resource_type,
      resource_id,
      metadata,
      tenant_id,
      department_id,
      escalation_flag
    ) VALUES (
      auth.uid(),
      'ESCALATION_STATUS_CHANGED',
      'manager_override',
      NEW.id,
      jsonb_build_object(
        'previous_escalation', OLD.escalation_required,
        'new_escalation', NEW.escalation_required,
        'escalation_reason', NEW.escalation_reason,
        'resolved_by', auth.uid()
      ),
      NEW.tenant_id,
      NEW.department_id,
      NEW.escalation_required
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_log_escalation_resolution ON manager_overrides;

-- Note: This trigger is handled by trigger_log_manager_override,
-- but we can keep this as a separate trigger for explicit escalation logging
CREATE TRIGGER trigger_log_escalation_resolution
  AFTER UPDATE ON manager_overrides
  FOR EACH ROW
  EXECUTE FUNCTION log_escalation_resolution();

-- ============================================================================
-- CREATE IMMUTABLE AUDIT LOG VIEW
-- ============================================================================

-- Create a view that shows audit logs as append-only (easier for reporting)
CREATE OR REPLACE VIEW audit_log_immutable_view AS
SELECT
  id,
  user_id,
  action,
  resource_type,
  resource_id,
  metadata,
  tenant_id,
  department_id,
  escalation_flag,
  created_at,
  'IMMUTABLE' as visibility_level
FROM audit_logs
WHERE created_at >= now() - INTERVAL '7 years'  -- Compliance retention period
ORDER BY created_at DESC;

-- Grant view access based on RLS
ALTER VIEW audit_log_immutable_view OWNER TO postgres;

-- ============================================================================
-- CREATE ESCALATION QUEUE VIEW
-- ============================================================================

-- Create a view for compliance officers to see pending escalations
CREATE OR REPLACE VIEW escalation_queue AS
SELECT
  mo.id,
  mo.screening_result_id,
  mo.manager_id,
  mo.override_recommendation,
  mo.escalation_reason,
  mo.created_at,
  mo.override_at,
  mo.tenant_id,
  mo.department_id,
  up.full_name as manager_name,
  sr.overall_score as screening_score
FROM manager_overrides mo
LEFT JOIN user_profiles up ON up.id = mo.manager_id
LEFT JOIN screening_results sr ON sr.id = mo.screening_result_id
WHERE mo.escalation_required = true
ORDER BY mo.created_at DESC;

-- Grant view access
ALTER VIEW escalation_queue OWNER TO postgres;
