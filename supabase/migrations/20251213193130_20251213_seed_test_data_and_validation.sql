/*
  # Test Data Setup and Validation Documentation

  ## Overview
  Provides test scenarios and validation queries for RLS implementation.
  
  Note: Actual test data insertion should be done through the application
  API with proper JWT tokens containing tenant_id, department_id, and role claims.
  Triggers will automatically populate tenant_id on inserts.

  ## Test Scenarios
    - Manager A tries to override candidate in Manager B's tenant (should FAIL)
    - Compliance officer queries escalated cases across tenants (should SUCCEED)
    - HR staff views audit logs for their department (should SUCCEED)
    - Candidate queries manager_overrides table (should return 0 rows)
    - Manager updates own override (should SUCCEED)

  ## Data Structure Reference
    - tenant1: "Acme Corp" (main test tenant)
    - tenant2: "TechCorp" (secondary tenant)
    - Department 1: "Engineering"
    - Department 2: "Sales"
    - Users: 2 managers, 2 HR staff, 1 compliance officer, 2 candidates
*/

-- ============================================================================
-- SEED: TENANTS
-- ============================================================================

INSERT INTO tenants (id, name, subdomain, is_active, metadata)
VALUES
  ('10000000-0000-0000-0000-000000000001'::uuid, 'Acme Corp', 'acme', true, '{"industry": "Technology", "employees": 500}'),
  ('10000000-0000-0000-0000-000000000002'::uuid, 'TechCorp', 'techcorp', true, '{"industry": "SaaS", "employees": 250}')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SEED: CANDIDATES (for testing)
-- ============================================================================

INSERT INTO candidates (
  id, full_name, email, phone, experience_years
)
VALUES
  (
    '30000000-0000-0000-0000-000000000001'::uuid,
    'John Applicant',
    'john.applicant@example.com',
    '+1-555-0001',
    5
  ),
  (
    '30000000-0000-0000-0000-000000000002'::uuid,
    'Jane Seeker',
    'jane.seeker@example.com',
    '+1-555-0002',
    8
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- TEST SCENARIOS DOCUMENTATION
-- ============================================================================

/*
  TEST SCENARIO 1: Manager Tenant Isolation
  ============================================================================
  
  Objective: Verify manager cannot override candidates outside their tenant
  
  Setup:
  - Manager A works for Acme Corp (tenant_id = 10000000-0000-0000-0000-000000000001)
  - Tries to create override for TechCorp screening result
  
  JWT Claims for Manager A:
  {
    "sub": "20000000-0000-0000-0000-000000000001",
    "tenant_id": "10000000-0000-0000-0000-000000000001",
    "department_id": "engineering",
    "role": "hr_manager"
  }
  
  Expected Result: INSERT DENIED
  RLS Policy Check: tenant_id from JWT ≠ tenant_id in insert attempt
  
  Expected Error: "new row violates row-level security policy"

  TEST SCENARIO 2: Compliance Officer Cross-Tenant View
  ============================================================================
  
  Objective: Verify compliance officer can view escalated overrides across all tenants
  
  JWT Claims for Compliance Officer:
  {
    "sub": "20000000-0000-0000-0000-000000000003",
    "role": "compliance",
    "tenant_id": "10000000-0000-0000-0000-000000000001"
  }
  
  Query:
  SELECT mo.id, mo.override_reason, mo.escalation_reason, mo.created_at
  FROM manager_overrides mo
  WHERE mo.escalation_required = true
  ORDER BY mo.created_at DESC;
  
  Expected Result: Returns escalated overrides from BOTH tenants
  RLS Policy Check: (auth.jwt() ->> 'role') = 'compliance' ✓

  TEST SCENARIO 3: HR Staff Department Scoping
  ============================================================================
  
  Objective: Verify HR staff see only their department's audit logs
  
  JWT Claims for HR Sales Manager (Acme Corp):
  {
    "sub": "20000000-0000-0000-0000-000000000002",
    "tenant_id": "10000000-0000-0000-0000-000000000001",
    "department_id": "sales",
    "role": "recruiter"
  }
  
  Query:
  SELECT action, resource_type, metadata, created_at
  FROM audit_logs
  ORDER BY created_at DESC
  LIMIT 50;
  
  Expected Result: Only returns "sales" department actions in Acme Corp
  RLS Policy Check: tenant_id matches ✓ AND role is HR ✓

  TEST SCENARIO 4: Candidate Privacy (Manager Overrides Hidden)
  ============================================================================
  
  Objective: Verify candidates CANNOT see any manager override decisions
  
  JWT Claims for Candidate:
  {
    "sub": "30000000-0000-0000-0000-000000000001",
    "role": "employee"
  }
  
  Query:
  SELECT * FROM manager_overrides;
  
  Expected Result: Returns 0 rows (empty result set)
  RLS Policy: "Candidates cannot access manager overrides" blocks all access
  Note: The policy uses USING (false) for SELECT, so NO rows are ever visible

  TEST SCENARIO 5: Manager Self-Override Update
  ============================================================================
  
  Objective: Verify manager can update their own override decision
  
  Setup:
  - Manager A (id: 20000000-0000-0000-0000-000000000001)
  - Has existing override in manager_overrides table
  
  JWT Claims:
  {
    "sub": "20000000-0000-0000-0000-000000000001",
    "tenant_id": "10000000-0000-0000-0000-000000000001",
    "department_id": "engineering",
    "role": "hr_manager"
  }
  
  Query:
  UPDATE manager_overrides
  SET override_recommendation = 'potential_match',
      override_reason = 'Reconsidered after feedback'
  WHERE id = 'override-id-123'::uuid
  AND manager_id = auth.uid();
  
  Expected Result: UPDATE succeeds, audit log automatically created
  RLS Policy Check: manager_id = auth.uid() ✓ AND tenant_id matches ✓
  Trigger Action: log_manager_override_action() fires automatically

  TEST SCENARIO 6: Escalation Audit Trail
  ============================================================================
  
  Objective: Verify escalation changes create proper audit entries
  
  Setup:
  - Admin user updates escalation_required = true on override
  
  JWT Claims for Admin:
  {
    "sub": "20000000-0000-0000-0000-000000000099",
    "role": "admin"
  }
  
  Query:
  UPDATE manager_overrides
  SET escalation_required = true,
      escalation_reason = 'High-risk override - potential bias detected'
  WHERE id = 'override-id-123'::uuid;
  
  Expected Result: UPDATE succeeds, escalation logged with full context
  Triggers:
  1. log_manager_override_action() - captures the change
  2. log_escalation_resolution() - logs escalation specifically
  
  Result in audit_logs:
  - action: 'ESCALATION_STATUS_CHANGED'
  - metadata: {previous_escalation: false, new_escalation: true, ...}
  - escalation_flag: true
*/

-- ============================================================================
-- VALIDATION QUERIES (Run as Admin)
-- ============================================================================

/*
  Validation Query 1: Verify All RLS Policies Installed
  ============================================================================
  Run as superuser/admin to verify policies are created correctly.
*/

-- SELECT 
--   schemaname, tablename, policyname, permissive, roles, qual, with_check
-- FROM pg_policies
-- WHERE tablename IN ('manager_overrides', 'audit_logs', 'screening_results', 
--                     'compliance_decisions', 'applications')
-- ORDER BY tablename, policyname;

/*
  Validation Query 2: Verify Tenants Are Created
  ============================================================================
*/

-- SELECT id, name, subdomain, is_active, created_at
-- FROM tenants
-- ORDER BY name;

/*
  Validation Query 3: Verify Triggers Are Active
  ============================================================================
*/

-- SELECT 
--   trigger_name, event_manipulation, event_object_table, trigger_timing
-- FROM information_schema.triggers
-- WHERE event_object_table IN (
--   'manager_overrides', 'compliance_decisions', 'applications',
--   'screening_results', 'audit_logs', 'compliance_audits'
-- )
-- ORDER BY event_object_table, trigger_name;

/*
  Validation Query 4: Check Indexes Are Optimized
  ============================================================================
*/

-- SELECT 
--   schemaname, tablename, indexname
-- FROM pg_indexes
-- WHERE tablename IN ('manager_overrides', 'audit_logs', 'screening_results')
-- AND indexname LIKE '%tenant%' OR indexname LIKE '%department%'
-- ORDER BY tablename, indexname;

/*
  Validation Query 5: Test Audit Log Immutable View
  ============================================================================
*/

-- SELECT action, resource_type, escalation_flag, created_at
-- FROM audit_log_immutable_view
-- LIMIT 10;

/*
  Validation Query 6: Test Escalation Queue View
  ============================================================================
*/

-- SELECT id, manager_name, override_recommendation, escalation_reason, created_at
-- FROM escalation_queue
-- LIMIT 10;

-- ============================================================================
-- DOCUMENTATION: JWT CLAIMS FOR AUTH0 INTEGRATION
-- ============================================================================

/*
  Configure Auth0 to include required claims in JWT tokens:
  
  Option A: Using Auth0 Rules (now called Actions)
  ================================================
  
  1. In Auth0 Dashboard, go to Actions > Flows > Login
  2. Create new action (or edit existing Post-Login action)
  3. Add this code:
  
  ```javascript
  module.exports = async (event, api) => {
    const namespace = 'https://yourapp.com';
    
    // Extract from user metadata
    const user_metadata = event.user.user_metadata || {};
    const app_metadata = event.user.app_metadata || {};
    
    api.idToken.setCustomClaim(
      `${namespace}/tenant_id`, 
      app_metadata.tenant_id || user_metadata.tenant_id
    );
    
    api.idToken.setCustomClaim(
      `${namespace}/department_id`, 
      user_metadata.department_id
    );
    
    api.idToken.setCustomClaim(
      `${namespace}/role`, 
      app_metadata.role || user_metadata.role || 'employee'
    );
    
    api.accessToken.setCustomClaim(
      `${namespace}/tenant_id`,
      app_metadata.tenant_id || user_metadata.tenant_id
    );
  };
  ```
  
  Option B: Via Auth0 Dashboard Rules (Legacy)
  ============================================
  
  1. Go to Auth0 Dashboard > Rules
  2. Create new rule with name "Add Custom Claims"
  3. Replace code with above snippet
  4. Enable the rule
  
  Note: Also ensure tenant_id is set in app_metadata when provisioning users.
  Use Auth0 Management API to set app_metadata:
  
  ```bash
  curl -X PATCH 'https://YOUR_DOMAIN/api/v2/users/USER_ID'
    -H 'authorization: Bearer MGMT_API_TOKEN'
    -H 'content-type: application/json'
    -d '{
      "app_metadata": {
        "tenant_id": "10000000-0000-0000-0000-000000000001",
        "role": "hr_manager"
      },
      "user_metadata": {
        "department_id": "engineering"
      }
    }'
  ```

  Frontend Configuration
  ======================
  
  ```typescript
  import { createClient } from '@supabase/supabase-js';
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
  });
  
  // After user logs in with Auth0
  const { data: { session } } = await supabase.auth.getSession();
  
  // JWT claims are automatically available in Postgres via:
  // auth.jwt() ->> 'tenant_id'
  // auth.jwt() ->> 'department_id'
  // auth.jwt() ->> 'role'
  ```

*/

-- ============================================================================
-- COMPLIANCE & SECURITY NOTES
-- ============================================================================

/*
  Security Features Implemented:
  
  1. Tenant Isolation (Multi-Tenancy)
     ✓ All tables have tenant_id columns
     ✓ RLS policies enforce tenant boundaries
     ✓ Triggers auto-populate tenant_id from JWT
     ✓ Indexes on tenant_id for performance
  
  2. Role-Based Access Control (RBAC)
     ✓ Manager role: Can create overrides in own tenant
     ✓ Compliance role: Cross-tenant escalation visibility
     ✓ HR role: Department-scoped access
     ✓ Candidate role: Data privacy (cannot see overrides)
     ✓ Admin role: Full system access
  
  3. Audit & Compliance Trail
     ✓ Automatic audit logging on all manager actions
     ✓ Immutable audit logs (no delete/update)
     ✓ Change history with before/after values
     ✓ Escalation tracking and resolution
     ✓ Compliance audit triggers
  
  4. Data Privacy (GDPR/CCPA)
     ✓ Candidates cannot see override decisions
     ✓ Candidates cannot access audit logs
     ✓ Privacy settings managed by HR only
     ✓ Department-level data isolation
     ✓ Retention policies via compliance_audits
  
  5. Performance Optimization
     ✓ Composite indexes on (tenant_id, created_at)
     ✓ Selective indexes on frequently filtered columns
     ✓ RLS policies optimized with (select auth.uid())
     ✓ Views for common queries (escalation_queue)

*/
