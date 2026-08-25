import { describe, it, expect } from "vitest";
import { evaluatePolicyRules } from "../../lib/recovery/policy-engine";
import { PaymentCaseRecord } from "../../lib/db";

describe("Deterministic Policy Engine — Happy Path", () => {
  it("should approve recovery when all 5 policy rules pass cleanly", () => {
    const validCase: PaymentCaseRecord = {
      id: "case-happy-1",
      razorpay_payment_id: "pay_test_happy_123",
      amount: 1000,
      currency: "INR",
      current_status: "DETECTED",
      safety_state: "ACTIVE",
      integrity_state: "TRUSTED",
      retry_count: 0,
      last_retry_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = evaluatePolicyRules(validCase, "RETRY_NOW");

    expect(result.status).toBe("APPROVED");
    expect(result.violatedRules.length).toBe(0);
    expect(result.passedRules).toContain("INTEGRITY_CHECK_PASSED");
    expect(result.passedRules).toContain("MAX_RETRIES_CHECK_PASSED");
    expect(result.passedRules).toContain("COOLDOWN_CHECK_PASSED");
  });
});
