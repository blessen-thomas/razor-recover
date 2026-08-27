import { describe, it, expect, beforeEach } from "vitest";
import { processMerchantQuery } from "../../lib/assistant/assistant-engine";
import { memoryStore, PaymentCaseRecord } from "../../lib/db";

describe("Merchant Assistant Engine — Safety & Explanatory Capabilities", () => {
  beforeEach(() => {
    memoryStore.clear();

    // Seed 1: Safe Happy Case (₹499)
    const happyCase: PaymentCaseRecord = {
      id: "case-happy-499",
      razorpay_payment_id: "pay_happy_499",
      amount: 499,
      currency: "INR",
      current_status: "RECOVERY_INITIATED",
      safety_state: "ACTIVE",
      integrity_state: "TRUSTED",
      retry_count: 0,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryStore.cases.set(happyCase.id, happyCase);

    // Seed 2: Contradictory Unsafe Case (₹1,500)
    const unsafeCase: PaymentCaseRecord = {
      id: "case-unsafe-1500",
      razorpay_payment_id: "pay_unsafe_1500",
      amount: 1500,
      currency: "INR",
      current_status: "ESCALATED",
      safety_state: "ESCALATED",
      integrity_state: "CONTRADICTORY",
      retry_count: 0,
      created_at: new Date(Date.now() - 1800000).toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryStore.cases.set(unsafeCase.id, unsafeCase);

    // Seed 3: Stale Reconciliation Case (₹299)
    const reconcileCase: PaymentCaseRecord = {
      id: "case-reconcile-299",
      razorpay_payment_id: "pay_reconcile_299",
      amount: 299,
      currency: "INR",
      current_status: "DETECTED",
      safety_state: "AWAITING_RECONCILIATION",
      integrity_state: "STALE",
      retry_count: 0,
      created_at: new Date(Date.now() - 7200000).toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryStore.cases.set(reconcileCase.id, reconcileCase);
  });

  it("strictly refuses action requests and explains safety engine authority", async () => {
    const actionQueries = [
      "Retry this payment",
      "Recover this payment",
      "Override the block on pay_unsafe_1500",
      "Refund money for ₹1,500",
      "Execute recovery now",
    ];

    for (const q of actionQueries) {
      const res = await processMerchantQuery(q);
      expect(res.answer).toContain("explanatory assistant");
      expect(res.answer).toContain("cannot authorize or execute");
      expect(res.answer).toContain("deterministic safety engine");
    }
  });

  it("explains why the ₹1,500 payment was blocked", async () => {
    const res = await processMerchantQuery("Why was the ₹1,500 payment blocked?");
    expect(res.answer).toContain("blocked");
    expect(res.answer).toContain("contradictory");
    expect(res.referencedCaseIds).toContain("case-unsafe-1500");
  });

  it("explains why the ₹299 payment is waiting for reconciliation", async () => {
    const res = await processMerchantQuery("Why is the ₹299 payment waiting for reconciliation?");
    expect(res.answer).toContain("stale");
    expect(res.answer).toContain("reconciliation");
    expect(res.referencedCaseIds).toContain("case-reconcile-299");
  });

  it("explains the recovery status for the ₹499 safe case without claiming it is already recovered", async () => {
    const res = await processMerchantQuery("Which payment is currently being recovered?");
    expect(res.answer).toContain("Recovery in Progress");
    expect(res.answer).toContain("does not mean the payment has already been successfully recovered");
    expect(res.referencedCaseIds).toContain("case-happy-499");
  });

  it("lists cases needing merchant attention", async () => {
    const res = await processMerchantQuery("Which cases need my attention?");
    expect(res.answer).toContain("attention");
    expect(res.referencedCaseIds).toContain("case-unsafe-1500");
    expect(res.referencedCaseIds).toContain("case-reconcile-299");
  });

  it("summarizes today's recovery cases", async () => {
    const res = await processMerchantQuery("Summarize today's recovery cases.");
    expect(res.answer).toContain("Summary");
    expect(res.answer).toContain("Total Cases");
    expect(res.answer).toContain("Revenue at Risk");
  });
});
