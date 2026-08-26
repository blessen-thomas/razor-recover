# Data Model & Schema Specifications: RazorRecover

**Feature Branch**: `001-safe-payment-recovery`  
**Date**: 2026-08-25  

## 1. Entity Relationship Overview

```
+-------------------+        1:N        +--------------------+
|   payment_cases   |------------------>|   payment_events   |
+-------------------+                   +--------------------+
          |                                       |
          | 1:N                                   | 1:1
          v                                       v
+-------------------+                   +--------------------+
| ai_investigations |                   |  audit_log_entries |
+-------------------+                   +--------------------+
          |                                       ^
          | 1:1                                   |
          v                                       |
+-------------------+                             |
|   policy_checks   |-----------------------------+
+-------------------+
          |
          | 1:1 (if APPROVED)
          v
+-------------------+
|  recovery_actions |
+-------------------+
```

---

## 2. Database Schema Definitions (SQL / PostgreSQL)

### 2.1 `payment_cases` Table
Tracks the primary state and lifecycle of a payment recovery instance.

```sql
CREATE TYPE case_status AS ENUM (
  'DETECTED', 
  'INVESTIGATING', 
  'RECOVERY_PENDING', 
  'RECOVERY_INITIATED', 
  'RECOVERED', 
  'FAILED', 
  'ESCALATED', 
  'CLOSED'
);

CREATE TYPE safety_state AS ENUM (
  'ACTIVE', 
  'PAUSED', 
  'BLOCKED', 
  'AWAITING_RECONCILIATION', 
  'ESCALATED'
);

CREATE TYPE integrity_state AS ENUM (
  'TRUSTED', 
  'STALE', 
  'DUPLICATE', 
  'OUT_OF_ORDER', 
  'INCOMPLETE', 
  'CONTRADICTORY'
);

CREATE TABLE payment_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razorpay_payment_id VARCHAR(255) NOT NULL UNIQUE,
  razorpay_order_id VARCHAR(255),
  amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),
  payment_method VARCHAR(50),
  error_code VARCHAR(100),
  error_description TEXT,
  current_status case_status NOT NULL DEFAULT 'DETECTED',
  safety_state safety_state NOT NULL DEFAULT 'ACTIVE',
  integrity_state integrity_state NOT NULL DEFAULT 'TRUSTED',
  retry_count INT NOT NULL DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_cases_status ON payment_cases(current_status, safety_state);
CREATE INDEX idx_payment_cases_rzp_id ON payment_cases(razorpay_payment_id);
```

### 2.2 `payment_events` Table
Stores raw and parsed webhook payload events.

```sql
CREATE TABLE payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES payment_cases(id) ON DELETE CASCADE,
  event_id VARCHAR(255) NOT NULL UNIQUE, -- Razorpay event ID (e.g., event_Lxyz123)
  event_type VARCHAR(100) NOT NULL,    -- payment.failed, payment.authorized, etc.
  payload JSONB NOT NULL,
  event_timestamp TIMESTAMPTZ NOT NULL,
  sequence_number INT NOT NULL,
  is_duplicate BOOLEAN NOT NULL DEFAULT FALSE,
  integrity_state integrity_state NOT NULL DEFAULT 'TRUSTED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_events_case_id ON payment_events(case_id);
CREATE INDEX idx_payment_events_event_id ON payment_events(event_id);
```

### 2.3 `ai_investigations` Table
Records evidence synthesis and proposed decisions from the LLM.

```sql
CREATE TYPE ai_decision AS ENUM (
  'RETRY_NOW', 
  'RETRY_LATER', 
  'NO_ACTION', 
  'ESCALATE'
);

CREATE TABLE ai_investigations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES payment_cases(id) ON DELETE CASCADE,
  evidence_summary JSONB NOT NULL,     -- Synthesized timeline, error code, timestamps
  proposed_decision ai_decision NOT NULL,
  reasoning TEXT NOT NULL,
  risk_factors JSONB,                  -- List of identified risk flags
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_investigations_case_id ON ai_investigations(case_id);
```

### 2.4 `policy_checks` Table
Captures deterministic validation results from the safety engine.

```sql
CREATE TYPE policy_status AS ENUM (
  'APPROVED', 
  'BLOCKED', 
  'ESCALATED'
);

CREATE TABLE policy_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES payment_cases(id) ON DELETE CASCADE,
  investigation_id UUID NOT NULL REFERENCES ai_investigations(id) ON DELETE CASCADE,
  status policy_status NOT NULL,
  passed_rules JSONB NOT NULL,         -- Array of rule names passed
  violated_rules JSONB NOT NULL,       -- Array of rule names violated
  deterministic_reason TEXT NOT NULL,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_policy_checks_case_id ON policy_checks(case_id);
```

### 2.5 `recovery_actions` Table
Logs execution details of recovery attempts against Razorpay APIs.

```sql
CREATE TABLE recovery_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES payment_cases(id) ON DELETE CASCADE,
  policy_check_id UUID NOT NULL REFERENCES policy_checks(id) ON DELETE CASCADE,
  action_type VARCHAR(100) NOT NULL,   -- e.g., CREATE_PAYMENT_LINK, RETRY_SUBSCRIPTION
  razorpay_entity_id VARCHAR(255),    -- Payment Link ID (e.g., plink_Kxyz123)
  api_request_payload JSONB NOT NULL,
  api_response_payload JSONB,
  status VARCHAR(50) NOT NULL,         -- SUCCESS, FAILED, PENDING
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recovery_actions_case_id ON recovery_actions(case_id);
```

### 2.6 `audit_log_entries` Table
Immutable audit trail tying all 7 pipeline steps together.

```sql
CREATE TABLE audit_log_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES payment_cases(id) ON DELETE CASCADE,
  step_number INT NOT NULL,            -- 1: Detect, 2: Investigate, 3: Decide, 4: Policy Check, 5: Act/Escalate, 6: Reconcile, 7: Measure
  step_name VARCHAR(50) NOT NULL,
  actor VARCHAR(50) NOT NULL,           -- SYSTEM, LLM, POLICY_ENGINE, RECONCILIATION_JOB, OPERATOR
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_case_id ON audit_log_entries(case_id, step_number);
```

---

## 3. Policy Rules Engine Specification (TypeScript Schema)

```typescript
export interface PolicyRuleInput {
  caseId: string;
  retryCount: number;
  lastRetryAt: Date | null;
  currentStatus: string;
  integrityState: 'TRUSTED' | 'STALE' | 'DUPLICATE' | 'OUT_OF_ORDER' | 'INCOMPLETE' | 'CONTRADICTORY';
  proposedDecision: 'RETRY_NOW' | 'RETRY_LATER' | 'NO_ACTION' | 'ESCALATE';
}

export interface PolicyRuleResult {
  status: 'APPROVED' | 'BLOCKED' | 'ESCALATED';
  passedRules: string[];
  violatedRules: string[];
  reason: string;
}

// Hardcoded Deterministic Policy Constants
export const POLICY_BOUNDS = {
  MAX_RETRIES: 2,
  COOLDOWN_MINUTES: 15,
  PERMITTED_INTEGRITY_STATES: ['TRUSTED']
};
```
