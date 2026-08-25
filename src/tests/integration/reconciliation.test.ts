import { describe, it, expect } from "vitest";
import { reconcilePaymentCase } from "../../lib/recovery/reconciliation-engine";
import { memoryStore, PaymentCaseRecord } from "../../lib/db";

describe("Integration Test — US3 State Reconciliation & API Failure Handling", () => {
  it("should reconcile case integrity to TRUSTED when API fetch succeeds", async () => {
    memoryStore.clear();

    const staleCase: PaymentCaseRecord = {
      id: "case-reconcile-1",
      razorpay_payment_id: "pay_stale_reconcile_1",
      amount: 1200,
      currency: "INR",
      current_status: "DETECTED",
      safety_state: "AWAITING_RECONCILIATION",
      integrity_state: "STALE",
      retry_count: 0,
      last_retry_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryStore.cases.set(staleCase.id, staleCase);

    const result = await reconcilePaymentCase(staleCase.id);

    expect(result.status).toBe("RECONCILED");
    expect(result.newIntegrityState).toBe("TRUSTED");
    expect(staleCase.integrity_state).toBe("TRUSTED");
    expect(staleCase.safety_state).toBe("ACTIVE");
  });
});
