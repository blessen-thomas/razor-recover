import { evaluateEventIntegrity } from "../src/lib/recovery/event-evaluator";
import { investigatePaymentCase } from "../src/lib/recovery/ai-investigator";
import { evaluatePolicyRules } from "../src/lib/recovery/policy-engine";
import { executeRecoveryAction } from "../src/lib/recovery/recovery-executor";
import { memoryStore, PaymentCaseRecord } from "../src/lib/db";
import { logAuditEntry } from "../src/lib/recovery/audit-logger";

async function runHappyPathSeed() {
  console.log("🚀 Seeding Demo Scenario 1: Happy Path Autonomous Payment Recovery...");

  const paymentId = `pay_happy_${Math.floor(1000 + Math.random() * 9000)}`;

  const webhookPayload = {
    event: "payment.failed",
    event_id: `evt_${paymentId}`,
    payload: {
      payment: {
        entity: {
          id: paymentId,
          amount: 49900,
          currency: "INR",
          error_code: "BAD_REQUEST_ERROR",
          error_description: "Payment failed due to temporary bank network issue.",
          email: "customer_happy@example.com",
          contact: "+919876543210",
        },
      },
    },
  };

  // Step 1: Detect
  const integrity = evaluateEventIntegrity(webhookPayload, []);
  const paymentCase: PaymentCaseRecord = {
    id: crypto.randomUUID(),
    razorpay_payment_id: paymentId,
    amount: 499,
    currency: "INR",
    customer_email: "customer_happy@example.com",
    customer_phone: "+919876543210",
    error_code: "BAD_REQUEST_ERROR",
    current_status: "DETECTED",
    safety_state: "ACTIVE",
    integrity_state: integrity.integrityState,
    retry_count: 0,
    last_retry_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  memoryStore.cases.set(paymentCase.id, paymentCase);

  await logAuditEntry(paymentCase.id, { number: 1, name: "Detect", actor: "WEBHOOK" }, {
    eventType: "payment.failed",
    integrityState: integrity.integrityState,
    reason: integrity.reason,
  });

  // Step 2 & 3: Investigate & Decide
  const investigation = await investigatePaymentCase(paymentCase, []);
  await logAuditEntry(paymentCase.id, { number: 2, name: "Investigate", actor: "AI_ENGINE" }, investigation.evidenceSummary);
  await logAuditEntry(paymentCase.id, { number: 3, name: "Decide", actor: "AI_ENGINE" }, {
    proposedDecision: investigation.proposedDecision,
    reasoning: investigation.reasoning,
  });

  // Step 4: Policy Check
  const policyResult = evaluatePolicyRules(paymentCase, investigation.proposedDecision);
  const policyCheckId = crypto.randomUUID();
  await logAuditEntry(paymentCase.id, { number: 4, name: "Policy Check", actor: "POLICY_ENGINE" }, policyResult);

  // Step 5: Act
  const execution = await executeRecoveryAction(paymentCase, policyCheckId, policyResult);
  await logAuditEntry(paymentCase.id, { number: 5, name: "Act or Escalate", actor: "RECOVERY_EXECUTOR" }, execution);

  // Step 7: Measure
  await logAuditEntry(paymentCase.id, { number: 7, name: "Measure", actor: "SYSTEM" }, {
    finalStatus: paymentCase.current_status,
    safetyState: paymentCase.safety_state,
    outcome: "RECOVERY_LINK_GENERATED_SUCCESSFULLY",
  });

  console.log(`✅ Happy Path Seed Complete! Created Case ID: ${paymentCase.id} (Payment: ${paymentId})`);
  console.log(`Inspect live audit at http://localhost:3000/cases/${paymentCase.id}`);
}

runHappyPathSeed().catch(console.error);
