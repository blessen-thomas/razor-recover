import { NextRequest, NextResponse } from "next/server";
import { validateWebhookSignature } from "@/lib/razorpay";
import { memoryStore, PaymentCaseRecord, PaymentEventRecord } from "@/lib/db";
import { evaluateEventIntegrity } from "@/lib/recovery/event-evaluator";
import { investigatePaymentCase } from "@/lib/recovery/ai-investigator";
import { evaluatePolicyRules } from "@/lib/recovery/policy-engine";
import { executeRecoveryAction } from "@/lib/recovery/recovery-executor";
import { logAuditEntry } from "@/lib/recovery/audit-logger";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    // Optional HMAC validation in production mode
    if (signature && process.env.NODE_ENV === "production") {
      const isValid = validateWebhookSignature(rawBody, signature);
      if (!isValid) {
        return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 400 });
      }
    }

    const payload = JSON.parse(rawBody);
    const eventId = payload.event_id || `event_${crypto.randomUUID().slice(0, 8)}`;
    const eventType = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;

    if (!paymentEntity) {
      return NextResponse.json({ error: "MISSING_PAYMENT_ENTITY" }, { status: 400 });
    }

    const razorpayPaymentId = paymentEntity.id;

    // STEP 1: DETECT & CREATE/GET CASE
    let paymentCase = Array.from(memoryStore.cases.values()).find(
      (c) => c.razorpay_payment_id === razorpayPaymentId
    );

    const caseEvents = Array.from(memoryStore.events.values()).filter(
      (e) => e.case_id === paymentCase?.id
    );

    // Evaluate Event Integrity
    const integrityResult = evaluateEventIntegrity(payload, caseEvents);

    if (!paymentCase) {
      paymentCase = {
        id: crypto.randomUUID(),
        razorpay_payment_id: razorpayPaymentId,
        razorpay_order_id: paymentEntity.order_id || null,
        amount: (paymentEntity.amount || 0) / 100,
        currency: paymentEntity.currency || "INR",
        customer_email: paymentEntity.email || null,
        customer_phone: paymentEntity.contact || null,
        payment_method: paymentEntity.method || null,
        error_code: paymentEntity.error_code || null,
        error_description: paymentEntity.error_description || null,
        current_status: eventType === "payment.captured" ? "RECOVERED" : "DETECTED",
        safety_state: integrityResult.integrityState === "TRUSTED" ? "ACTIVE" : integrityResult.integrityState === "STALE" ? "AWAITING_RECONCILIATION" : "ESCALATED",
        integrity_state: integrityResult.integrityState,
        retry_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      memoryStore.cases.set(paymentCase.id, paymentCase);
    } else {
      paymentCase.integrity_state = integrityResult.integrityState;
      if (integrityResult.integrityState === "STALE") {
        paymentCase.safety_state = "AWAITING_RECONCILIATION";
      } else if (integrityResult.integrityState !== "TRUSTED") {
        paymentCase.safety_state = "ESCALATED";
      }
      memoryStore.cases.set(paymentCase.id, paymentCase);
    }

    // Record Payment Event
    const eventRecord: PaymentEventRecord = {
      id: crypto.randomUUID(),
      case_id: paymentCase.id,
      event_id: eventId,
      event_type: eventType,
      payload: payload,
      event_timestamp: new Date().toISOString(),
      sequence_number: caseEvents.length + 1,
      is_duplicate: integrityResult.isDuplicate,
      integrity_state: integrityResult.integrityState,
      created_at: new Date().toISOString(),
    };
    memoryStore.events.set(eventId, eventRecord);

    // STEP 1 AUDIT LOG
    await logAuditEntry(paymentCase.id, { number: 1, name: "Detect", actor: "WEBHOOK" }, {
      eventId,
      eventType,
      integrityState: integrityResult.integrityState,
      reason: integrityResult.reason,
    });

    // If duplicate event, suppress recovery processing
    if (integrityResult.isDuplicate) {
      return NextResponse.json({
        status: "ignored",
        reason: "DUPLICATE_EVENT",
        case_id: paymentCase.id,
        integrity_state: "DUPLICATE",
      });
    }

    // STEP 2 & 3: INVESTIGATE & DECIDE (AI Evidence Synthesis)
    const investigation = await investigatePaymentCase(paymentCase, [...caseEvents, eventRecord]);

    memoryStore.investigations.set(investigation.evidenceSummary.paymentId, {
      id: crypto.randomUUID(),
      case_id: paymentCase.id,
      evidence_summary: investigation.evidenceSummary,
      proposed_decision: investigation.proposedDecision,
      reasoning: investigation.reasoning,
      risk_factors: investigation.riskFactors,
      created_at: new Date().toISOString(),
    });

    // STEP 2 & 3 AUDIT LOGS
    await logAuditEntry(paymentCase.id, { number: 2, name: "Investigate", actor: "AI_ENGINE" }, investigation.evidenceSummary);
    await logAuditEntry(paymentCase.id, { number: 3, name: "Decide", actor: "AI_ENGINE" }, {
      proposedDecision: investigation.proposedDecision,
      reasoning: investigation.reasoning,
      riskFactors: investigation.riskFactors,
    });

    // STEP 4: DETERMINISTIC POLICY CHECK
    const policyResult = evaluatePolicyRules(paymentCase, investigation.proposedDecision);

    const policyCheckRecordId = crypto.randomUUID();
    memoryStore.policyChecks.set(policyCheckRecordId, {
      id: policyCheckRecordId,
      case_id: paymentCase.id,
      investigation_id: investigation.evidenceSummary.paymentId,
      status: policyResult.status,
      passed_rules: policyResult.passedRules,
      violated_rules: policyResult.violatedRules,
      deterministic_reason: policyResult.deterministicReason,
      evaluated_at: new Date().toISOString(),
    });

    // STEP 4 AUDIT LOG
    await logAuditEntry(paymentCase.id, { number: 4, name: "Policy Check", actor: "POLICY_ENGINE" }, policyResult);

    // STEP 5: ACT OR ESCALATE
    let executionOutcome: any = null;
    if (policyResult.status === "APPROVED") {
      executionOutcome = await executeRecoveryAction(paymentCase, policyCheckRecordId, policyResult);
      await logAuditEntry(paymentCase.id, { number: 5, name: "Act or Escalate", actor: "RECOVERY_EXECUTOR" }, executionOutcome);
    } else {
      paymentCase.safety_state = policyResult.status === "ESCALATED" ? "ESCALATED" : "BLOCKED";
      paymentCase.current_status = policyResult.status === "ESCALATED" ? "ESCALATED" : "FAILED";
      memoryStore.cases.set(paymentCase.id, paymentCase);

      await logAuditEntry(paymentCase.id, { number: 5, name: "Act or Escalate", actor: "POLICY_ENGINE" }, {
        status: policyResult.status,
        reason: policyResult.deterministicReason,
        actionTaken: "AUTONOMOUS_ACTION_SUPPRESSED",
      });
    }

    // STEP 7: MEASURE & RESPOND
    await logAuditEntry(paymentCase.id, { number: 7, name: "Measure", actor: "SYSTEM" }, {
      finalStatus: paymentCase.current_status,
      safetyState: paymentCase.safety_state,
      retryCount: paymentCase.retry_count,
    });

    return NextResponse.json({
      status: "processed",
      case_id: paymentCase.id,
      integrity_state: paymentCase.integrity_state,
      policy_status: policyResult.status,
      proposed_decision: investigation.proposedDecision,
      executed: policyResult.status === "APPROVED",
      recovery_action: executionOutcome?.actionRecord?.action_type || null,
    });
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return NextResponse.json({ error: err.message || "INTERNAL_ERROR" }, { status: 500 });
  }
}
