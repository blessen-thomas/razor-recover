import { describe, it, expect } from "vitest";
import { evaluateEventIntegrity } from "../../lib/recovery/event-evaluator";

describe("Event Integrity Evaluator — Unsafe Paths & Failure Modes", () => {
  it("should classify duplicate event ID as DUPLICATE", () => {
    const payload = { event_id: "evt_dup_123", event: "payment.failed", payload: { payment: { entity: { id: "pay_1" } } } };
    const existingEvents: any = [{ event_id: "evt_dup_123", event_type: "payment.failed" }];

    const result = evaluateEventIntegrity(payload, existingEvents);

    expect(result.integrityState).toBe("DUPLICATE");
    expect(result.isDuplicate).toBe(true);
  });

  it("should classify payment.failed following payment.captured as CONTRADICTORY", () => {
    const payload = { event_id: "evt_fail_999", event: "payment.failed", payload: { payment: { entity: { id: "pay_1" } } } };
    const existingEvents: any = [{ event_id: "evt_cap_111", event_type: "payment.captured" }];

    const result = evaluateEventIntegrity(payload, existingEvents);

    expect(result.integrityState).toBe("CONTRADICTORY");
    expect(result.isDuplicate).toBe(false);
  });

  it("should classify stale timestamp payload (>1h) as STALE", () => {
    const TWO_HOURS_AGO_SEC = Math.floor(Date.now() / 1000) - 7200;
    const payload = {
      event_id: "evt_stale_123",
      event: "payment.failed",
      created_at: TWO_HOURS_AGO_SEC,
      payload: { payment: { entity: { id: "pay_stale", created_at: TWO_HOURS_AGO_SEC } } },
    };

    const result = evaluateEventIntegrity(payload, []);

    expect(result.integrityState).toBe("STALE");
  });
});
