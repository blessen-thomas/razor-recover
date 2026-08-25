import { describe, it, expect } from "vitest";
import { evaluatePolicyRules } from "../../lib/recovery/policy-engine";
import { PaymentCaseRecord } from "../../lib/db";

describe("Deterministic Policy Safety Engine — Hard Rules & AI Overrides", () => {
  it("should BLOCK recovery if AI recommends RETRY_NOW but max retries (2) are reached", () => {
    const maxRetryCase: PaymentCaseRecord = {
      id: "case-max-retries",
      razorpay_payment_id: "pay_test_max_retry",
      amount: 500,
      currency: "INR",
      current_status: "FAILED",
      safety_state: "ACTIVE",
      integrity_state: "TRUSTED",
      retry_count: 2,
      last_retry_at: new Date(Date.now() - 3600000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = evaluatePolicyRules(maxRetryCase, "RETRY_NOW");

    expect(result.status).toBe("BLOCKED");
    expect(result.violatedRules).toContain("MAX_RETRIES_EXCEEDED");
  });

  it("should BLOCK recovery if AI recommends RETRY_NOW during 15-minute cooldown", () => {
    const FIVE_MINS_AGO = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const cooldownCase: PaymentCaseRecord = {
      id: "case-cooldown",
      razorpay_payment_id: "pay_test_cooldown",
      amount: 500,
      currency: "INR",
      current_status: "FAILED",
      safety_state: "ACTIVE",
      integrity_state: "TRUSTED",
      retry_count: 1,
      last_retry_at: FIVE_MINS_AGO,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = evaluatePolicyRules(cooldownCase, "RETRY_NOW");

    expect(result.status).toBe("BLOCKED");
    expect(result.violatedRules.some((r) => r.includes("COOLDOWN_ACTIVE"))).toBe(true);
  });
});
