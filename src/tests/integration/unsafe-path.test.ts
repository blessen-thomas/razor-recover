import { describe, it, expect } from "vitest";
import { evaluateEventIntegrity } from "../../lib/recovery/event-evaluator";
import { investigatePaymentCase } from "../../lib/recovery/ai-investigator";
import { evaluatePolicyRules } from "../../lib/recovery/policy-engine";
import { memoryStore, PaymentCaseRecord } from "../../lib/db";

describe("Integration Test — US2 Unsafe Path Escalation Flow", () => {
  it("should halt autonomous action and mark safety state ESCALATED when contradictory events occur", async () => {
    memoryStore.clear();

    const initialCapturedEvent = {
      event: "payment.captured",
      event_id: "evt_captured_1",
      payload: {
        payment: {
          entity: {
            id: "pay_contradict_100",
            amount: 75000,
            currency: "INR",
            status: "captured",
          },
        },
      },
    };

    const paymentCase: PaymentCaseRecord = {
      id: "case-contradict-1",
      razorpay_payment_id: "pay_contradict_100",
      amount: 750,
      currency: "INR",
      current_status: "RECOVERED",
      safety_state: "ACTIVE",
      integrity_state: "TRUSTED",
      retry_count: 0,
      last_retry_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryStore.cases.set(paymentCase.id, paymentCase);
    memoryStore.events.set("evt_captured_1", {
      id: "e1",
      case_id: paymentCase.id,
      event_id: "evt_captured_1",
      event_type: "payment.captured",
      payload: initialCapturedEvent,
      event_timestamp: new Date().toISOString(),
      sequence_number: 1,
      is_duplicate: false,
      integrity_state: "TRUSTED",
      created_at: new Date().toISOString(),
    });

    // Ingest contradictory payment.failed event AFTER payment.captured
    const contradictoryPayload = {
      event: "payment.failed",
      event_id: "evt_stale_failed_2",
      payload: {
        payment: {
          entity: {
            id: "pay_contradict_100",
            amount: 75000,
            currency: "INR",
            error_code: "BAD_REQUEST_ERROR",
          },
        },
      },
    };

    const caseEvents = Array.from(memoryStore.events.values()).filter((e) => e.case_id === paymentCase.id);
    const integrity = evaluateEventIntegrity(contradictoryPayload, caseEvents);
    expect(integrity.integrityState).toBe("CONTRADICTORY");

    paymentCase.integrity_state = integrity.integrityState;
    paymentCase.safety_state = "ESCALATED";

    const investigation = await investigatePaymentCase(paymentCase, caseEvents);
    expect(investigation.proposedDecision).toBe("ESCALATE");

    const policyResult = evaluatePolicyRules(paymentCase, investigation.proposedDecision);
    expect(policyResult.status).toBe("ESCALATED");
    expect(paymentCase.safety_state).toBe("ESCALATED");
  });
});
