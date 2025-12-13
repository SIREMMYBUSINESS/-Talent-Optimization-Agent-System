# Tenant-Isolated Row-Level Security (RLS) Implementation

## Executive Summary

This document describes the comprehensive Row-Level Security (RLS) and multi-tenant isolation system implemented for the Talent Optimization Agent. The system enforces data isolation, role-based access control, and maintains complete audit trails for compliance and security monitoring.

**Key Features:**
- Multi-tenant data isolation via JWT-based tenant_id
- Role-based access control (managers, HR staff, compliance officers, candidates)
- Automatic audit logging for all sensitive actions
- Department-level scoping for HR staff accountability
- Candidate data privacy (hidden from candidates)
- Compliance officer cross-tenant oversight
- Immutable audit trails for regulatory compliance

---

## Architecture Overview

### Database Schema Enhancements

Five core tables have been enhanced with tenant isolation:

1. **applications** - Candidate applications
2. **screening_results** - AI screening outcomes
3. **manager_overrides** - Manager override decisions
4. **audit_logs** - System action tracking
5. **compliance_decisions** - Compliance audit findings

New tables created:

1. **tenants** - Multi-tenant configuration and metadata
2. **user_tenant_mapping** - Maps users to their tenant(s)

### Column Additions

All core tables now include:
- `tenant_id` (uuid) - Foreign key to tenants table
- `department_id` (text) - Department context for scoping
- For audit_logs: `escalation_flag` (boolean) - Marks escalated actions

---

## Role-Based Access Control

### 1. Managers

**Responsibilities:**
- Create override decisions for candidates in their application pipeline
- Account for their override decisions with escalation reasons
- Update only their own override recommendations

**RLS Policies:**

```sql
-- Can CREATE overrides only in their tenant/department
INSERT INTO manager_overrides (...)
  -> Checks: manager_id = auth.uid()
  -> AND tenant_id matches JWT claim

-- Can VIEW only their own overrides
SELECT * FROM manager_overrides
  -> Checks: manager_id = auth.uid()
  -> AND tenant_id matches JWT claim

-- Can UPDATE only their own overrides
UPDATE manager_overrides SET ...
  -> Same checks as SELECT + UPDATE
  -> Trigger automatically logs change
```

**JWT Claims Required:**
```json
{
  "sub": "user-id",
  "tenant_id": "uuid",
  "department_id": "engineering",
  "role": "hr_manager"
}
```

**Example: Manager A Cannot Override Candidates Outside Tenant**
```
Manager A (Acme Corp) tries to override candidate in TechCorp
↓
RLS Policy Checks:
  ✓ manager_id = auth.uid() (identity verified)
  ✗ tenant_id ≠ JWT tenant_id (VIOLATION)
↓
Result: INSERT DENIED with "new row violates row-level security policy"
```

### 2. Compliance Officers

**Responsibilities:**
- Monitor escalated override decisions across all tenants
- Track bias and high-risk decisions
- Review audit trails for compliance violations
- Read-only access (cannot create or modify overrides)

**RLS Policies:**

```sql
-- Can VIEW all escalated overrides across tenants
SELECT * FROM manager_overrides
  -> Checks: (auth.jwt() ->> 'role') = 'compliance'
  -> AND escalation_required = true

-- Can VIEW all audit logs
SELECT * FROM audit_logs
  -> Checks: (auth.jwt() ->> 'role') = 'compliance'

-- Cannot INSERT, UPDATE, or DELETE (read-only)
```

**JWT Claims Required:**
```json
{
  "sub": "user-id",
  "role": "compliance",
  "tenant_id": "any" // optional, not used for filtering
}
```

**Example: Compliance Officer Views Cross-Tenant Escalations**
```
Compliance Officer queries escalated overrides
↓
RLS Policy Checks:
  ✓ auth.jwt() ->> 'role' = 'compliance'
  ✓ escalation_required = true
↓
Result: SELECT returns escalations from Acme Corp AND TechCorp
```

### 3. HR Staff

**Responsibilities:**
- Manage applications and screening results within their department
- View audit logs for accountability tracking
- Create and update compliance decisions
- Limited to their tenant and department

**RLS Policies:**

```sql
-- Can VIEW applications in their department
SELECT * FROM applications
  -> Checks: tenant_id matches JWT claim
  -> AND role IN ('admin', 'hr_manager', 'recruiter')

-- Can VIEW audit logs for their tenant
SELECT * FROM audit_logs
  -> Checks: tenant_id matches JWT claim
  -> AND department_id matches JWT claim (optional)

-- Can CREATE and UPDATE screening results
INSERT/UPDATE screening_results
  -> Checks: tenant_id matches JWT claim
  -> AND role IN ('admin', 'hr_manager', 'recruiter')
```

**JWT Claims Required:**
```json
{
  "sub": "user-id",
  "tenant_id": "uuid",
  "department_id": "sales",
  "role": "recruiter"
}
```

**Example: HR Staff See Only Their Department's Actions**
```
HR Sales Manager queries audit_logs
↓
RLS Policy Checks:
  ✓ tenant_id = Acme Corp (from JWT)
  ✓ role IN ('recruiter', 'hr_manager')
  ✓ (optionally department_id = 'sales')
↓
Result: SELECT returns only "sales" department actions in Acme Corp
        Engineering department actions are filtered out
```

### 4. Candidates

**Responsibilities:**
- View only their own applications
- View only their own (published) job postings
- Cannot see manager decisions, audit logs, or compliance data

**RLS Policies:**

```sql
-- Cannot access manager_overrides (even if they exist)
SELECT * FROM manager_overrides
  -> Checks: USING (false) - ALWAYS blocks

-- Cannot access audit_logs
SELECT * FROM audit_logs
  -> Checks: User must be HR staff to view

-- Can VIEW only own applications
SELECT * FROM applications
  -> Checks: candidate_id = auth.uid()

-- Can VIEW published jobs
SELECT * FROM job_postings
  -> Checks: status = 'published'
```

**JWT Claims Required:**
```json
{
  "sub": "user-id",
  "role": "employee"
}
```

**Example: Candidate Cannot See Override Decisions**
```
Candidate queries manager_overrides
↓
RLS Policy: "Candidates cannot access manager overrides"
  -> USING (false) - blocks ALL access
↓
Result: SELECT returns 0 rows (empty result set)
        Even if overrides exist, they are completely hidden
```

### 5. Admins

**Responsibilities:**
- Full system access
- Update escalation flags and compliance audit status
- Manage tenants and user-tenant mappings
- Access all audit logs and compliance data

**RLS Policies:**

```sql
-- Can access all tables
-- No filters except those that enforce immutability (e.g., audit logs)

-- Special: Audit logs are still append-only
DELETE FROM audit_logs
  -> ALWAYS blocked (RLS prevents deletion)
```

**JWT Claims Required:**
```json
{
  "sub": "user-id",
  "role": "admin"
}
```

---

## Automatic Audit Logging

### Trigger-Based Logging

All sensitive actions are automatically logged via triggers:

#### Trigger 1: `trigger_log_manager_override`
**Fires on:** INSERT or UPDATE to `manager_overrides`

**Captures:**
- Manager ID (actor)
- Original vs. new recommendation
- Escalation status and reasons
- Compliance audit triggers
- Full change metadata

**Example Audit Log Entry:**
```json
{
  "action": "MANAGER_OVERRIDE_CREATED",
  "resource_type": "manager_override",
  "resource_id": "override-123",
  "user_id": "manager-456",
  "tenant_id": "acme-corp",
  "department_id": "engineering",
  "metadata": {
    "screening_result_id": "sr-789",
    "previous": {},
    "current": {
      "original_recommendation": "good_match",
      "override_recommendation": "no_match",
      "override_reason": "Skills gap detected"
    }
  },
  "created_at": "2024-12-13T10:30:00Z"
}
```

#### Trigger 2: `trigger_log_escalation_resolution`
**Fires on:** UPDATE to `manager_overrides` (escalation status change)

**Captures:**
- Previous escalation status
- New escalation status
- Escalation reason
- Who resolved it (admin ID)

#### Trigger 3: `trigger_log_compliance_decision`
**Fires on:** INSERT to `compliance_decisions`

**Captures:**
- Framework (GDPR, EEOC, general)
- Decision type and result
- Severity level
- Explanation and rule reference

#### Trigger 4: `trigger_populate_tenant_id_from_jwt`
**Fires on:** INSERT to multiple tables (applications, screening_results, etc.)

**Function:**
- Extracts tenant_id from JWT claim if not provided
- Extracts department_id from JWT claim if not provided
- Ensures all records have tenant context

### Immutable Audit Trail

Once an audit log is created, it cannot be modified or deleted:

```sql
-- Attempting to delete audit logs
DELETE FROM audit_logs WHERE id = '123'
  -> RLS Policy: "Audit logs are immutable"
  -> USING (false) - ALWAYS blocks
  -> Result: DELETE DENIED

-- Attempting to update audit logs
UPDATE audit_logs SET action = 'FAKE_ACTION'
  -> No UPDATE policies allow it
  -> Result: UPDATE DENIED
```

### Audit Log View

Access immutable audit logs via the view:

```sql
SELECT * FROM audit_log_immutable_view
WHERE created_at > now() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- Result: Read-only view with compliance-compliant retention
```

---

## Escalation Management

### Escalation Queue

Compliance officers can use the escalation queue view to manage high-risk overrides:

```sql
SELECT * FROM escalation_queue
ORDER BY created_at DESC;

-- Returns escalated overrides with:
-- - Manager name
-- - Override recommendation
-- - Escalation reason
-- - Original screening score
-- - Tenant and department context
```

### Escalation Workflow

1. **Manager creates override** with `escalation_required = true`
   - Trigger logs action with `escalation_flag = true`
   - Appears in escalation_queue immediately

2. **Compliance officer reviews** the escalated override
   - Has read-only access
   - Can see full context and audit trail

3. **Admin resolves escalation** by updating `escalation_required = false`
   - Trigger logs resolution with admin ID
   - Audit log captures the decision

4. **Audit trail shows complete lifecycle**
   - Creation timestamp and reason
   - Resolution timestamp and approver
   - All intermediate checks

---

## JWT Claims Configuration

### Auth0 Setup

Configure Auth0 to include required claims in JWT tokens:

#### Option A: Using Auth0 Actions (Recommended)

1. Go to Auth0 Dashboard → Actions → Flows → Login
2. Create new action or edit Post-Login action
3. Add code:

```javascript
module.exports = async (event, api) => {
  const namespace = 'https://yourapp.com';

  // Get from user app_metadata and user_metadata
  const app_metadata = event.user.app_metadata || {};
  const user_metadata = event.user.user_metadata || {};

  // Add tenant_id (stored in app_metadata for security)
  api.idToken.setCustomClaim(
    `${namespace}/tenant_id`,
    app_metadata.tenant_id
  );

  // Add department_id (can be in user_metadata)
  api.idToken.setCustomClaim(
    `${namespace}/department_id`,
    user_metadata.department_id
  );

  // Add role (stored in app_metadata for security)
  api.idToken.setCustomClaim(
    `${namespace}/role`,
    app_metadata.role || 'employee'
  );

  // Also add to access token for API calls
  api.accessToken.setCustomClaim(
    `${namespace}/tenant_id`,
    app_metadata.tenant_id
  );
};
```

#### Setting User Metadata via Auth0 Management API

```bash
curl -X PATCH 'https://YOUR_DOMAIN/api/v2/users/USER_ID' \
  -H 'Authorization: Bearer MGMT_API_TOKEN' \
  -H 'Content-Type: application/json' \
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

### Frontend Integration

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});

// After Auth0 login, JWT claims are automatically available
const { data: { session } } = await supabase.auth.getSession();

// Access claims in Postgres via auth.jwt()
// Example query:
const { data, error } = await supabase
  .from('manager_overrides')
  .select('*')
  .eq('escalation_required', true);

// RLS automatically filters based on:
// - auth.jwt() ->> 'tenant_id'
// - auth.jwt() ->> 'department_id'
// - auth.jwt() ->> 'role'
```

---

## Testing & Validation

### Validation Queries

Run as admin to verify RLS implementation:

#### 1. Verify RLS Policies Are Installed

```sql
SELECT
  tablename, policyname, permissive, roles, qual
FROM pg_policies
WHERE tablename IN ('manager_overrides', 'audit_logs', 'screening_results')
ORDER BY tablename, policyname;
```

#### 2. Check Tenants Are Created

```sql
SELECT id, name, subdomain, is_active, created_at
FROM tenants
ORDER BY name;
```

#### 3. Verify Triggers Are Active

```sql
SELECT
  trigger_name, event_manipulation, event_object_table, trigger_timing
FROM information_schema.triggers
WHERE event_object_table IN ('manager_overrides', 'compliance_decisions', 'applications')
ORDER BY event_object_table, trigger_name;
```

#### 4. Check Indexes for Performance

```sql
SELECT
  schemaname, tablename, indexname
FROM pg_indexes
WHERE (indexname LIKE '%tenant%' OR indexname LIKE '%department%')
  AND tablename IN ('manager_overrides', 'audit_logs', 'screening_results')
ORDER BY tablename, indexname;
```

### Test Scenarios

#### Scenario 1: Manager Tenant Isolation ✓

**Goal:** Verify manager cannot override candidates outside their tenant

**Setup:**
- Manager A works for Acme Corp (tenant_id = 10000...)
- Attempts to create override for TechCorp screening result

**JWT:**
```json
{
  "sub": "manager-a",
  "tenant_id": "10000000-0000-0000-0000-000000000001",
  "role": "hr_manager"
}
```

**Query:**
```sql
INSERT INTO manager_overrides (
  screening_result_id, manager_id, original_recommendation,
  override_recommendation, override_reason, escalation_required,
  tenant_id -- Explicitly set to TechCorp
) VALUES (
  'sr-techcorp-001'::uuid,
  auth.uid(),
  'good_match',
  'no_match',
  'Not qualified',
  false,
  '10000000-0000-0000-0000-000000000002'::uuid -- TechCorp
);
```

**Expected:** INSERT DENIED (RLS violation)

**Why:** RLS policy checks `tenant_id = auth.jwt() ->> 'tenant_id'`
- JWT has Acme Corp
- Insert attempts TechCorp
- Mismatch → DENIED

#### Scenario 2: Compliance Officer Cross-Tenant Access ✓

**Goal:** Verify compliance officer sees escalated overrides from all tenants

**Setup:**
- Compliance officer with `role = 'compliance'`
- Escalated overrides exist in both Acme Corp and TechCorp

**JWT:**
```json
{
  "sub": "compliance-officer",
  "role": "compliance"
}
```

**Query:**
```sql
SELECT mo.id, mo.override_reason, mo.escalation_reason, mo.created_at
FROM manager_overrides mo
WHERE mo.escalation_required = true
ORDER BY mo.created_at DESC;
```

**Expected:** SELECT returns escalations from BOTH tenants

**Why:** RLS policy allows compliance role without tenant filter:
```sql
USING ((auth.jwt() ->> 'role') = 'compliance' AND escalation_required = true)
```

#### Scenario 3: HR Staff Department Scoping ✓

**Goal:** Verify HR staff see only their department's data

**Setup:**
- HR Sales Manager at Acme Corp
- Audit logs contain mixed departments

**JWT:**
```json
{
  "sub": "hr-sales",
  "tenant_id": "10000000-0000-0000-0000-000000000001",
  "department_id": "sales",
  "role": "recruiter"
}
```

**Query:**
```sql
SELECT action, resource_type, metadata, created_at
FROM audit_logs
ORDER BY created_at DESC
LIMIT 50;
```

**Expected:** SELECT returns only "sales" department actions in Acme Corp

**Why:** RLS policy checks both tenant and department:
```sql
USING (
  tenant_id = (SELECT id FROM tenants WHERE id::text = auth.jwt() ->> 'tenant_id')
  AND (department_id = auth.jwt() ->> 'department_id' OR role = 'admin')
)
```

#### Scenario 4: Candidate Privacy ✓

**Goal:** Verify candidates cannot see manager override decisions

**Setup:**
- Candidate logs in
- Multiple overrides exist for their applications

**JWT:**
```json
{
  "sub": "candidate-123",
  "role": "employee"
}
```

**Query:**
```sql
SELECT * FROM manager_overrides;
```

**Expected:** SELECT returns 0 rows (empty result set)

**Why:** RLS policy blocks all candidate access:
```sql
CREATE POLICY "Candidates cannot access manager overrides"
  ON manager_overrides
  FOR SELECT
  TO authenticated
  USING (false);  -- ALWAYS blocks
```

The `USING (false)` means candidates will NEVER see any rows, regardless of query.

#### Scenario 5: Automatic Audit Logging ✓

**Goal:** Verify manager override changes are logged automatically

**Setup:**
- Manager A updates their override decision
- Trigger fires automatically

**Query:**
```sql
UPDATE manager_overrides
SET override_recommendation = 'potential_match',
    override_reason = 'Reconsidered after feedback'
WHERE id = 'override-123'::uuid
  AND manager_id = auth.uid();
```

**Expected:** UPDATE succeeds, audit log created

**Result in audit_logs:**
```json
{
  "action": "MANAGER_OVERRIDE_UPDATED",
  "resource_type": "manager_override",
  "metadata": {
    "previous": {
      "override_recommendation": "good_match",
      "override_reason": "Original reason"
    },
    "current": {
      "override_recommendation": "potential_match",
      "override_reason": "Reconsidered after feedback"
    }
  },
  "created_at": "2024-12-13T10:35:00Z"
}
```

---

## Performance Considerations

### Index Strategy

All critical filtering columns have indexes:

```sql
-- Tenant isolation indexes (highest priority)
CREATE INDEX idx_applications_tenant ON applications(tenant_id);
CREATE INDEX idx_screening_results_tenant ON screening_results(tenant_id);
CREATE INDEX idx_manager_overrides_tenant ON manager_overrides(tenant_id);
CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);

-- Department scoping indexes
CREATE INDEX idx_applications_department ON applications(department_id);
CREATE INDEX idx_audit_logs_department ON audit_logs(department_id);

-- Escalation filtering
CREATE INDEX idx_manager_overrides_escalation ON manager_overrides(escalation_required);
CREATE INDEX idx_audit_logs_escalation ON audit_logs(escalation_flag);

-- Time-based queries
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_manager_overrides_created ON manager_overrides(created_at DESC);
```

### RLS Policy Optimization

All policies use optimized `(select auth.uid())` syntax to prevent repeated function evaluation:

```sql
-- Good (optimized)
USING ((select auth.uid()) = manager_id)

-- Avoid (less efficient)
USING (auth.uid() = manager_id)
```

### Query Performance Best Practices

1. **Always filter by tenant_id in WHERE clause** when possible:
   ```sql
   -- RLS handles this, but explicit filtering helps optimizer
   SELECT * FROM manager_overrides
   WHERE tenant_id = '10000...'::uuid
   AND escalation_required = true;
   ```

2. **Use immutable view for audit logs** to avoid RLS re-evaluation:
   ```sql
   SELECT * FROM audit_log_immutable_view
   WHERE created_at > now() - INTERVAL '24 hours';
   ```

3. **Paginate large result sets**:
   ```sql
   SELECT * FROM audit_logs
   WHERE tenant_id = $1
   ORDER BY created_at DESC
   LIMIT 50
   OFFSET 0;  -- Increase offset for pagination
   ```

---

## Compliance & Security

### GDPR Compliance

- **Data Isolation:** Tenant isolation prevents unauthorized access across companies
- **Audit Trails:** Complete action history for data subject requests
- **Right to be Forgotten:** RLS policies can be updated to exclude specific users
- **Data Retention:** `audit_logs` view enforces 7-year retention for compliance

### EEOC/FCRA Compliance

- **Audit Trail for Decisions:** All override decisions logged with reasoning
- **Bias Detection Tracking:** Escalation reasons capture potential bias concerns
- **Decision Accountability:** Manager names linked to all override decisions
- **Compliance Officer Oversight:** Cross-tenant visibility for high-risk cases

### SOC 2 / ISO 27001 Compliance

- **Access Control:** RBAC with role-based policies
- **Immutable Audit Logs:** Cannot be modified or deleted
- **Automated Logging:** Triggers ensure no actions are missed
- **Encryption in Transit:** Supabase provides TLS/SSL

---

## Troubleshooting

### Issue: RLS Policy Blocks Legitimate Access

**Symptom:** User sees "policy violation" error or empty result set

**Debug Steps:**

1. **Check JWT claims:**
   ```typescript
   const { data: { session } } = await supabase.auth.getSession();
   const claims = session?.user?.user_metadata;
   console.log('JWT Claims:', claims);
   ```

2. **Verify tenant_id in database:**
   ```sql
   SELECT tenant_id FROM tenants WHERE name = 'Acme Corp';
   ```

3. **Check RLS policies:**
   ```sql
   SELECT policyname, qual FROM pg_policies
   WHERE tablename = 'manager_overrides'
   ORDER BY policyname;
   ```

4. **Test with service_role (admin bypass):**
   ```typescript
   // Service role client bypasses RLS
   const adminClient = createClient(URL, SERVICE_ROLE_KEY);
   const { data } = await adminClient
     .from('manager_overrides')
     .select('*');
   ```

### Issue: Audit Log Not Created

**Symptom:** INSERT/UPDATE succeeds but no audit log entry

**Debug Steps:**

1. **Check trigger status:**
   ```sql
   SELECT trigger_name, trigger_schema, is_enabled
   FROM information_schema.triggers
   WHERE event_object_table = 'manager_overrides';
   ```

2. **Test trigger manually:**
   ```sql
   INSERT INTO manager_overrides (
     screening_result_id, manager_id, original_recommendation,
     override_recommendation, override_reason, escalation_required
   ) VALUES (
     'test-sr'::uuid, auth.uid(), 'good', 'bad', 'Testing', false
   );

   -- Check audit_logs
   SELECT * FROM audit_logs
   ORDER BY created_at DESC LIMIT 1;
   ```

3. **Check for trigger errors:**
   ```sql
   -- Check if trigger function exists and is valid
   SELECT routine_name FROM information_schema.routines
   WHERE routine_name LIKE 'log_%';
   ```

### Issue: Performance Degradation

**Symptom:** Queries are slow, even with small datasets

**Debug Steps:**

1. **Check query plan:**
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM manager_overrides
   WHERE tenant_id = '10000...'::uuid
   AND escalation_required = true;
   ```

2. **Verify indexes exist:**
   ```sql
   SELECT indexname FROM pg_indexes
   WHERE tablename = 'manager_overrides'
   AND indexname LIKE '%tenant%';
   ```

3. **Check RLS policy complexity:**
   - Complex USING clauses with subqueries can slow queries
   - Use `audit_log_immutable_view` for read-heavy workloads

---

## Migration & Deployment

### Deployment Checklist

- [ ] Tenants created in database
- [ ] Auth0 claims configured (tenant_id, department_id, role)
- [ ] User metadata populated with tenant assignments
- [ ] All migrations applied successfully
- [ ] Triggers verified as active
- [ ] RLS policies tested with sample data
- [ ] Audit log view working correctly
- [ ] Escalation queue accessible to compliance officers
- [ ] Performance tests passed (query response <100ms)
- [ ] Candidate privacy verified (cannot see overrides)

### Rollback Procedure

If RLS needs to be disabled temporarily:

```sql
-- Disable RLS on tables (for troubleshooting only)
ALTER TABLE manager_overrides DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

-- Re-enable after fixes
ALTER TABLE manager_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
```

---

## Next Steps

1. **Configure Auth0 custom claims** using the script provided above
2. **Set up user metadata** with tenant_id, department_id, and role
3. **Run validation queries** to verify RLS is working correctly
4. **Test each scenario** documented in the Testing & Validation section
5. **Monitor audit logs** for suspicious patterns or access violations
6. **Set up alerts** for escalated overrides requiring compliance review

---

## Support & Maintenance

### Monitoring

```sql
-- Check for policy violations (failed access attempts)
SELECT COUNT(*) as violation_count
FROM audit_logs
WHERE action = 'RLS_POLICY_VIOLATION'
AND created_at > now() - INTERVAL '24 hours';

-- Monitor escalation queue for pending reviews
SELECT COUNT(*) as pending_escalations
FROM escalation_queue;

-- Check audit log growth
SELECT DATE(created_at) as day, COUNT(*) as log_count
FROM audit_logs
WHERE created_at > now() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY day DESC;
```

### Regular Maintenance

- Review audit logs for suspicious patterns (daily)
- Reconcile manager override decisions with hiring outcomes (weekly)
- Verify RLS policies haven't been accidentally modified (monthly)
- Test disaster recovery procedures (quarterly)
- Update documentation as policies evolve (as needed)
