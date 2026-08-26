-- RazorRecover Initial PostgreSQL Schema Migration
-- Enables tables for payment recovery tracking, event history, AI investigation, policy checks, recovery actions, and audit trail

-- Create Custom ENUM Types
DO $$ BEGIN
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
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE safety_state AS ENUM (
        'ACTIVE', 
        'PAUSED', 
        'BLOCKED', 
        'AWAITING_RECONCILIATION', 
        'ESCALATED'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE integrity_state AS ENUM (
        'TRUSTED', 
        'STALE', 
        'DUPLICATE', 
        'OUT_OF_ORDER', 
        'INCOMPLETE', 
        'CONTRADICTORY'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE ai_decision AS ENUM (
        'RETRY_NOW', 
        'RETRY_LATER', 
        'NO_ACTION', 
        'ESCALATE'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE policy_status AS ENUM (
        'APPROVED', 
        'BLOCKED', 
        'ESCALATED'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 1. payment_cases Table
CREATE TABLE IF NOT EXISTS payment_cases (
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

CREATE INDEX IF NOT EXISTS idx_payment_cases_status ON payment_cases(current_status, safety_state);
CREATE INDEX IF NOT EXISTS idx_payment_cases_rzp_id ON payment_cases(razorpay_payment_id);

-- 2. payment_events Table
CREATE TABLE IF NOT EXISTS payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES payment_cases(id) ON DELETE CASCADE,
    event_id VARCHAR(255) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    event_timestamp TIMESTAMPTZ NOT NULL,
    sequence_number INT NOT NULL DEFAULT 1,
    is_duplicate BOOLEAN NOT NULL DEFAULT FALSE,
    integrity_state integrity_state NOT NULL DEFAULT 'TRUSTED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_case_id ON payment_events(case_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_event_id ON payment_events(event_id);

-- 3. ai_investigations Table
CREATE TABLE IF NOT EXISTS ai_investigations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES payment_cases(id) ON DELETE CASCADE,
    evidence_summary JSONB NOT NULL,
    proposed_decision ai_decision NOT NULL,
    reasoning TEXT NOT NULL,
    risk_factors JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_investigations_case_id ON ai_investigations(case_id);

-- 4. policy_checks Table
CREATE TABLE IF NOT EXISTS policy_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES payment_cases(id) ON DELETE CASCADE,
    investigation_id UUID NOT NULL REFERENCES ai_investigations(id) ON DELETE CASCADE,
    status policy_status NOT NULL,
    passed_rules JSONB NOT NULL,
    violated_rules JSONB NOT NULL,
    deterministic_reason TEXT NOT NULL,
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_policy_checks_case_id ON policy_checks(case_id);

-- 5. recovery_actions Table
CREATE TABLE IF NOT EXISTS recovery_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES payment_cases(id) ON DELETE CASCADE,
    policy_check_id UUID NOT NULL REFERENCES policy_checks(id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL,
    razorpay_entity_id VARCHAR(255),
    api_request_payload JSONB NOT NULL,
    api_response_payload JSONB,
    status VARCHAR(50) NOT NULL,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recovery_actions_case_id ON recovery_actions(case_id);

-- 6. audit_log_entries Table
CREATE TABLE IF NOT EXISTS audit_log_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES payment_cases(id) ON DELETE CASCADE,
    step_number INT NOT NULL,
    step_name VARCHAR(50) NOT NULL,
    actor VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_case_id ON audit_log_entries(case_id, step_number);
