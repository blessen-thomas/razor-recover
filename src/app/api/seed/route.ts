import { NextRequest, NextResponse } from "next/server";
import { memoryStore, PaymentCaseRecord, PaymentEventRecord } from "@/lib/db";
import { evaluateEventIntegrity } from "@/lib/recovery/event-evaluator";
import { investigatePaymentCase } from "@/lib/recovery/ai-investigator";
import { evaluatePolicyRules } from "@/lib/recovery/policy-engine";
import { executeRecoveryAction } from "@/lib/recovery/recovery-executor";
import { logAuditEntry } from "@/lib/recovery/audit-logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const scenario = body.scenario || "happy";

    if (scenario === "happy") {
      const paymentId = `pay_happy_${Math.floor(1000 + Math.random() * 9000)}`;
      const webhookPayload = {
        event: "payment.failed",
        event_id: `evt_${paymentId}`,
        created_at: Math.floor(Date.now() / 1000),
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

      const integrity = evaluateEventIntegrity(webhookPayload, []);
      const paymentCase: PaymentCaseRecord = {
        id: crypto.randomUUID(),
        razorpay_payment_id: paymentId,
        amount: 499,
        currency: "INR",
        customer_email: "customer_happy@example.com",
        customer_phone: "+919876543210",
        error_code: "BAD_REQUEST_ERROR",
        error_description: "Payment failed due to temporary bank network issue.",
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

      const investigation = await investigatePaymentCase(paymentCase, []);
      memoryStore.investigations.set(paymentCase.razorpay_payment_id, {
        id: crypto.randomUUID(),
        case_id: paymentCase.id,
        evidence_summary: investigation.evidenceSummary,
        proposed_decision: investigation.proposedDecision,
        reasoning: investigation.reasoning,
        risk_factors: investigation.riskFactors,
        created_at: new Date().toISOString(),
      });

      await logAuditEntry(paymentCase.id, { number: 2, name: "Investigate", actor: "AI_ENGINE" }, investigation.evidenceSummary);
      await logAuditEntry(paymentCase.id, { number: 3, name: "Decide", actor: "AI_ENGINE" }, {
        proposedDecision: investigation.proposedDecision,
        reasoning: investigation.reasoning,
      });

      const policyResult = evaluatePolicyRules(paymentCase, investigation.proposedDecision);
      const policyCheckId = crypto.randomUUID();
      memoryStore.policyChecks.set(policyCheckId, {
        id: policyCheckId,
        case_id: paymentCase.id,
        investigation_id: paymentCase.razorpay_payment_id,
        status: policyResult.status,
        passed_rules: policyResult.passedRules,
        violated_rules: policyResult.violatedRules,
        deterministic_reason: policyResult.deterministicReason,
        evaluated_at: new Date().toISOString(),
      });
      await logAuditEntry(paymentCase.id, { number: 4, name: "Policy Check", actor: "POLICY_ENGINE" }, policyResult);

      const execution = await executeRecoveryAction(paymentCase, policyCheckId, policyResult);
      await logAuditEntry(paymentCase.id, { number: 5, name: "Act or Escalate", actor: "RECOVERY_EXECUTOR" }, execution);

      await logAuditEntry(paymentCase.id, { number: 7, name: "Measure", actor: "SYSTEM" }, {
        finalStatus: paymentCase.current_status,
        safetyState: paymentCase.safety_state,
        outcome: "RECOVERY_LINK_GENERATED_SUCCESSFULLY",
      });

      return NextResponse.json({ success: true, caseId: paymentCase.id, scenario: "happy" });
    }

    if (scenario === "unsafe") {
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
      memoryStore.cases.set(paymentCase.id, paymentCase);

      await logAuditEntry(paymentCase.id, { number: 1, name: "Detect", actor: "WEBHOOK" }, {
        eventType: "payment.failed",
        integrityState: integrity.integrityState,
        reason: integrity.reason,
        note: "Contradictory payment.failed received after payment.captured",
      });

      const investigation = await investigatePaymentCase(paymentCase, [capturedEvent]);
      memoryStore.investigations.set(paymentCase.razorpay_payment_id, {
        id: crypto.randomUUID(),
        case_id: paymentCase.id,
        evidence_summary: investigation.evidenceSummary,
        proposed_decision: investigation.proposedDecision,
        reasoning: investigation.reasoning,
        risk_factors: investigation.riskFactors,
        created_at: new Date().toISOString(),
      });

      await logAuditEntry(paymentCase.id, { number: 2, name: "Investigate", actor: "AI_ENGINE" }, investigation.evidenceSummary);
      await logAuditEntry(paymentCase.id, { number: 3, name: "Decide", actor: "AI_ENGINE" }, {
        proposedDecision: investigation.proposedDecision,
        reasoning: investigation.reasoning,
        riskFactors: investigation.riskFactors,
      });

      const policyResult = evaluatePolicyRules(paymentCase, investigation.proposedDecision);
      const policyCheckId = crypto.randomUUID();
      memoryStore.policyChecks.set(policyCheckId, {
        id: policyCheckId,
        case_id: paymentCase.id,
        investigation_id: paymentCase.razorpay_payment_id,
        status: policyResult.status,
        passed_rules: policyResult.passedRules,
        violated_rules: policyResult.violatedRules,
        deterministic_reason: policyResult.deterministicReason,
        evaluated_at: new Date().toISOString(),
      });
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

      return NextResponse.json({ success: true, caseId: paymentCase.id, scenario: "unsafe" });
    }

    if (scenario === "reconcile") {
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

      const investigation = await investigatePaymentCase(paymentCase, []);
      await logAuditEntry(paymentCase.id, { number: 2, name: "Investigate", actor: "AI_ENGINE" }, investigation.evidenceSummary);
      await logAuditEntry(paymentCase.id, { number: 3, name: "Decide", actor: "AI_ENGINE" }, {
        proposedDecision: investigation.proposedDecision,
        reasoning: investigation.reasoning,
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
        outcome: "PAUSED_AWAITING_OPERATOR_RECONCILIATION",
      });

      return NextResponse.json({ success: true, caseId: paymentCase.id, scenario: "reconcile" });
    }

    return NextResponse.json({ error: "INVALID_SCENARIO" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "SEED_ERROR" }, { status: 500 });
  }
}
