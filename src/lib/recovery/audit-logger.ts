import { memoryStore, AuditLogRecord, getSupabase } from "../db";

export type AuditStep =
  | { number: 1; name: "Detect"; actor: "SYSTEM" | "WEBHOOK" }
  | { number: 2; name: "Investigate"; actor: "LLM" | "AI_ENGINE" }
  | { number: 3; name: "Decide"; actor: "AI_ENGINE" }
  | { number: 4; name: "Policy Check"; actor: "POLICY_ENGINE" }
  | { number: 5; name: "Act or Escalate"; actor: "RECOVERY_EXECUTOR" | "POLICY_ENGINE" }
  | { number: 6; name: "Reconcile"; actor: "RECONCILIATION_ENGINE" | "OPERATOR" }
  | { number: 7; name: "Measure"; actor: "SYSTEM" | "OPERATOR" };

export async function logAuditEntry(caseId: string, step: AuditStep, payload: any): Promise<AuditLogRecord> {
  const entry: AuditLogRecord = {
    id: crypto.randomUUID(),
    case_id: caseId,
    step_number: step.number,
    step_name: step.name,
    actor: step.actor,
    payload: payload,
    created_at: new Date().toISOString(),
  };

  // Always store in memory store for local access
  memoryStore.auditLogs.push(entry);

  // Attempt Supabase insert if configured
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from("audit_log_entries").insert(entry);
    } catch (err) {
      console.warn("Could not insert audit log to Supabase:", err);
    }
  }

  return entry;
}

export function getAuditTrail(caseId: string): AuditLogRecord[] {
  return memoryStore.auditLogs
    .filter((entry) => entry.case_id === caseId)
    .sort((a, b) => a.step_number - b.step_number);
}
