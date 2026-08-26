import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

export interface PaymentCaseRecord {
  id: string;
  razorpay_payment_id: string;
  razorpay_order_id?: string | null;
  amount: number;
  currency: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  payment_method?: string | null;
  error_code?: string | null;
  error_description?: string | null;
  current_status: "DETECTED" | "INVESTIGATING" | "RECOVERY_PENDING" | "RECOVERY_INITIATED" | "RECOVERED" | "FAILED" | "ESCALATED" | "CLOSED";
  safety_state: "ACTIVE" | "PAUSED" | "BLOCKED" | "AWAITING_RECONCILIATION" | "ESCALATED";
  integrity_state: "TRUSTED" | "STALE" | "DUPLICATE" | "OUT_OF_ORDER" | "INCOMPLETE" | "CONTRADICTORY";
  retry_count: number;
  last_retry_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentEventRecord {
  id: string;
  case_id: string;
  event_id: string;
  event_type: string;
  payload: any;
  event_timestamp: string;
  sequence_number: number;
  is_duplicate: boolean;
  integrity_state: "TRUSTED" | "STALE" | "DUPLICATE" | "OUT_OF_ORDER" | "INCOMPLETE" | "CONTRADICTORY";
  created_at: string;
}

export interface AIInvestigationRecord {
  id: string;
  case_id: string;
  evidence_summary: any;
  proposed_decision: "RETRY_NOW" | "RETRY_LATER" | "NO_ACTION" | "ESCALATE";
  reasoning: string;
  risk_factors?: any;
  created_at: string;
}

export interface PolicyCheckRecord {
  id: string;
  case_id: string;
  investigation_id: string;
  status: "APPROVED" | "BLOCKED" | "ESCALATED";
  passed_rules: string[];
  violated_rules: string[];
  deterministic_reason: string;
  evaluated_at: string;
}

export interface RecoveryActionRecord {
  id: string;
  case_id: string;
  policy_check_id: string;
  action_type: string;
  razorpay_entity_id?: string | null;
  api_request_payload: any;
  api_response_payload?: any;
  status: string;
  executed_at: string;
}

export interface AuditLogRecord {
  id: string;
  case_id: string;
  step_number: number;
  step_name: string;
  actor: string;
  payload: any;
  created_at: string;
}

// In-Memory Database Store (for local execution & testing without live DB)
class MemoryStore {
  cases: Map<string, PaymentCaseRecord> = new Map();
  events: Map<string, PaymentEventRecord> = new Map();
  investigations: Map<string, AIInvestigationRecord> = new Map();
  policyChecks: Map<string, PolicyCheckRecord> = new Map();
  recoveryActions: Map<string, RecoveryActionRecord> = new Map();
  auditLogs: AuditLogRecord[] = [];

  clear() {
    this.cases.clear();
    this.events.clear();
    this.investigations.clear();
    this.policyChecks.clear();
    this.recoveryActions.clear();
    this.auditLogs = [];
  }
}

export const memoryStore = new MemoryStore();

let supabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;
  if (env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_URL !== "https://example.supabase.co") {
    supabaseClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    return supabaseClient;
  }
  return null;
}
