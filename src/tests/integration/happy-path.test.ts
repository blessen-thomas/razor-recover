import { describe, it, expect } from "vitest";
import { evaluateEventIntegrity } from "../../lib/recovery/event-evaluator";
import { investigatePaymentCase } from "../../lib/recovery/ai-investigator";
import { evaluatePolicyRules } from "../../lib/recovery/policy-engine";
import { executeRecoveryAction } from "../../lib/recovery/recovery-executor";
import { memoryStore, PaymentCaseRecord } from "../../lib/db";

describe("Integration Test — US1 Happy Path Pipeline", () => {
  it("should process valid payment.failed event end-to-end through all 7 pipeline steps", async () => {
    memoryStore.clear();

    const webhookPayload = {
      event: "payment.failed",
      event_id: "evt_integration_happy_1",
      payload: {
        payment: {
          entity: {
            id: "pay_integ_happy_100",
            amount: 50000,
            currency: "INR",
            error_code: "BAD_REQUEST_ERROR",
            error_description: "Payment failed due to insufficient funds.",
            email: "merchant_customer@example.com",
            contact: "+919876543210",
          },
        },
      },
    };

    // Step 1: Detect & Integrity Check
    const integrity = evaluateEventIntegrity(webhookPayload, []);
    expect(integrity.integrityState).toBe("TRUSTED");

    const paymentCase: PaymentCaseRecord = {
      id: "case-integ-happy-1",
      razorpay_payment_id: "pay_integ_happy_100",
      amount: 500,
      currency: "INR",
      customer_email: "merchant_customer@example.com",
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

    // Step 2 & 3: Investigate & Decide
    const investigation = await investigatePaymentCase(paymentCase, []);
    expect(investigation.proposedDecision).toBe("RETRY_NOW");

    // Step 4: Policy Check
    const policyResult = evaluatePolicyRules(paymentCase, investigation.proposedDecision);
    expect(policyResult.status).toBe("APPROVED");

    // Step 5: Act
    const execution = await executeRecoveryAction(paymentCase, "policy-check-1", policyResult);
    expect(execution.success).toBe(true);
    expect(execution.actionRecord.action_type).toBe("CREATE_PAYMENT_LINK");
    expect(paymentCase.current_status).toBe("RECOVERY_INITIATED");
    expect(paymentCase.retry_count).toBe(1);
  });
});
