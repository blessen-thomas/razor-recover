import { evaluateEventIntegrity } from "../src/lib/recovery/event-evaluator";
import { memoryStore, PaymentCaseRecord } from "../src/lib/db";
import { logAuditEntry } from "../src/lib/recovery/audit-logger";
import { reconcilePaymentCase } from "../src/lib/recovery/reconciliation-engine";

async function runReconcilePathSeed() {
  console.log("🚀 Seeding Demo Scenario 3: Webhook Gap & Reconciliation Flow...");

  const paymentId = `pay_reconcile_${Math.floor(1000 + Math.random() * 9000)}`;
  const TWO_HOURS_AGO_SEC = Math.floor(Date.now() / 1000) - 7200;

  const stalePayload = {
    event: "payment.failed",
    event_id: `evt_stale_${paymentId}`,
    created_at: TWO_HOURS_AGO_SEC,
    payload: {
      payment: {
        entity: {
          id: paymentId,
          amount: 29900,
          currency: "INR",
          error_code: "GATEWAY_ERROR",
          created_at: TWO_HOURS_AGO_SEC,
        },
      },
    },
  };

  const integrity = evaluateEventIntegrity(stalePayload, []);
  const paymentCase: PaymentCaseRecord = {
    id: crypto.randomUUID(),
    razorpay_payment_id: paymentId,
    amount: 299,
    currency: "INR",
    error_code: "GATEWAY_ERROR",
    current_status: "DETECTED",
    safety_state: "AWAITING_RECONCILIATION",
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
    note: "Stale event payload detected (> 1h old). Autonomous action paused pending API reconciliation.",
  });

  console.log(`⏸️ Case Created in AWAITING_RECONCILIATION State (ID: ${paymentCase.id})`);
  console.log("🔄 Executing API Reconciliation...");

  const reconResult = await reconcilePaymentCase(paymentCase.id);

  console.log(`✅ Reconciliation Result: ${reconResult.status} (New Integrity: ${reconResult.newIntegrityState})`);
  console.log(`Inspect live audit at http://localhost:3000/cases/${paymentCase.id}`);
}

runReconcilePathSeed().catch(console.error);
