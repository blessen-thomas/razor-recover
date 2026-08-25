import { evaluateEventIntegrity } from "../src/lib/recovery/event-evaluator";
import { investigatePaymentCase } from "../src/lib/recovery/ai-investigator";
import { evaluatePolicyRules } from "../src/lib/recovery/policy-engine";
import { memoryStore, PaymentCaseRecord, PaymentEventRecord } from "../src/lib/db";
import { logAuditEntry } from "../src/lib/recovery/audit-logger";

async function runUnsafePathSeed() {
  console.log("🚀 Seeding Demo Scenario 2: Unsafe Contradictory Event Stream (Safety Halt)...");

  try {
    const res = await fetch("http://localhost:3000/api/seed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario: "unsafe" }),
    });
    if (res.ok) {
      const data = await res.json();
      console.log(`🛑 Unsafe Path Seeded via Next.js API! Case ID: ${data.caseId}`);
      console.log(`Inspect live audit at http://localhost:3000/cases/${data.caseId}`);
      return;
    }
  } catch (_e) {
    // Next.js server not running, fallback to direct in-memory execution
  }

  const paymentId = `pay_unsafe_${Math.floor(1000 + Math.random() * 9000)}`;

  const paymentCase: PaymentCaseRecord = {
    id: crypto.randomUUID(),
    razorpay_payment_id: paymentId,
    amount: 1500,
    currency: "INR",
    customer_email: "customer_unsafe@example.com",
    customer_phone: "+919876543210",
    error_code: null,
    current_status: "RECOVERED",
    safety_state: "ACTIVE",
    integrity_state: "TRUSTED",
    retry_count: 0,
    last_retry_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  memoryStore.cases.set(paymentCase.id, paymentCase);

  // Initial event: Captured
  const capturedEvent: PaymentEventRecord = {
    id: crypto.randomUUID(),
    case_id: paymentCase.id,
    event_id: `evt_cap_${paymentId}`,
    event_type: "payment.captured",
    payload: { event: "payment.captured" },
    event_timestamp: new Date().toISOString(),
    sequence_number: 1,
    is_duplicate: false,
    integrity_state: "TRUSTED",
    created_at: new Date().toISOString(),
  };
  memoryStore.events.set(capturedEvent.event_id, capturedEvent);

  // Ingest CONTRADICTORY payment.failed event
  const contradictoryPayload = {
    event: "payment.failed",
    event_id: `evt_stale_fail_${paymentId}`,
    payload: {
      payment: {
        entity: {
          id: paymentId,
          amount: 150000,
          currency: "INR",
          error_code: "BAD_REQUEST_ERROR",
        },
      },
    },
  };

  const integrity = evaluateEventIntegrity(contradictoryPayload, [capturedEvent]);
  paymentCase.integrity_state = integrity.integrityState;
  paymentCase.safety_state = "ESCALATED";
  paymentCase.current_status = "ESCALATED";

  await logAuditEntry(paymentCase.id, { number: 1, name: "Detect", actor: "WEBHOOK" }, {
    eventType: "payment.failed",
    integrityState: integrity.integrityState,
    reason: integrity.reason,
    note: "Contradictory payment.failed received after payment.captured",
  });

  const investigation = await investigatePaymentCase(paymentCase, [capturedEvent]);
  await logAuditEntry(paymentCase.id, { number: 2, name: "Investigate", actor: "AI_ENGINE" }, investigation.evidenceSummary);
  await logAuditEntry(paymentCase.id, { number: 3, name: "Decide", actor: "AI_ENGINE" }, {
    proposedDecision: investigation.proposedDecision,
    reasoning: investigation.reasoning,
    riskFactors: investigation.riskFactors,
  });

  const policyResult = evaluatePolicyRules(paymentCase, investigation.proposedDecision);
  await logAuditEntry(paymentCase.id, { number: 4, name: "Policy Check", actor: "POLICY_ENGINE" }, policyResult);

  await logAuditEntry(paymentCase.id, { number: 5, name: "Act or Escalate", actor: "POLICY_ENGINE" }, {
    status: policyResult.status,
    reason: policyResult.deterministicReason,
    actionTaken: "AUTONOMOUS_ACTION_SUPPRESSED",
  });

  await logAuditEntry(paymentCase.id, { number: 7, name: "Measure", actor: "SYSTEM" }, {
    finalStatus: paymentCase.current_status,
    safetyState: paymentCase.safety_state,
    outcome: "SAFETY_HALT_ENFORCED_ACTION_BLOCKED",
  });

  console.log(`🛑 Unsafe Path Seed Complete! Created Case ID: ${paymentCase.id} (Safety State: ESCALATED)`);
  console.log(`Inspect live audit at http://localhost:3000/cases/${paymentCase.id}`);
}

runUnsafePathSeed().catch(console.error);
