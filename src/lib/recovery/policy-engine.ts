import { PaymentCaseRecord } from "../db";
import { AIDecision } from "./ai-investigator";

export type PolicyStatus = "APPROVED" | "BLOCKED" | "ESCALATED";

export interface PolicyEvaluationResult {
  status: PolicyStatus;
  passedRules: string[];
  violatedRules: string[];
  deterministicReason: string;
}

export const POLICY_BOUNDS = {
  MAX_RETRIES: 2,
  COOLDOWN_MINUTES: 15,
  PERMITTED_INTEGRITY_STATES: ["TRUSTED"],
};

export function evaluatePolicyRules(
  paymentCase: PaymentCaseRecord,
  aiDecision: AIDecision
): PolicyEvaluationResult {
  const passedRules: string[] = [];
  const violatedRules: string[] = [];

  // Rule 1: Integrity Check (MUST be TRUSTED)
  if (paymentCase.integrity_state === "TRUSTED") {
    passedRules.push("INTEGRITY_CHECK_PASSED");
  } else {
    violatedRules.push(`INTEGRITY_CHECK_FAILED (${paymentCase.integrity_state})`);
  }

  // Rule 2: Max Retry Limit Check (retry_count < 2)
  if (paymentCase.retry_count < POLICY_BOUNDS.MAX_RETRIES) {
    passedRules.push("MAX_RETRIES_CHECK_PASSED");
  } else {
    violatedRules.push("MAX_RETRIES_EXCEEDED");
  }

  // Rule 3: Cooldown Window Check (15 minutes)
  if (paymentCase.last_retry_at) {
    const lastRetryTime = new Date(paymentCase.last_retry_at).getTime();
    const now = Date.now();
    const cooldownMs = POLICY_BOUNDS.COOLDOWN_MINUTES * 60 * 1000;
    if (now - lastRetryTime >= cooldownMs) {
      passedRules.push("COOLDOWN_CHECK_PASSED");
    } else {
      const remainingMins = Math.ceil((cooldownMs - (now - lastRetryTime)) / 60000);
      violatedRules.push(`COOLDOWN_ACTIVE (${remainingMins}m remaining)`);
    }
  } else {
    passedRules.push("COOLDOWN_CHECK_PASSED");
  }

  // Rule 4: State Eligibility Check
  if (["DETECTED", "FAILED", "RECOVERY_PENDING"].includes(paymentCase.current_status)) {
    passedRules.push("STATE_ELIGIBILITY_PASSED");
  } else {
    violatedRules.push(`INELIGIBLE_STATE (${paymentCase.current_status})`);
  }

  // Rule 5: Proposed AI Decision Safety Alignment
  if (aiDecision === "NO_ACTION" || aiDecision === "ESCALATE") {
    violatedRules.push(`AI_DECISION_${aiDecision}`);
  } else {
    passedRules.push("AI_DECISION_SAFE");
  }

  // Determine Final Verdict
  if (violatedRules.length === 0 && aiDecision === "RETRY_NOW") {
    return {
      status: "APPROVED",
      passedRules,
      violatedRules,
      deterministicReason: "All 5 deterministic policy rules satisfied: Integrity TRUSTED, retry count < 2, cooldown satisfied, state eligible.",
    };
  }

  const isContradictory = paymentCase.integrity_state === "CONTRADICTORY" || paymentCase.integrity_state === "OUT_OF_ORDER";
  const status: PolicyStatus = isContradictory || aiDecision === "ESCALATE" ? "ESCALATED" : "BLOCKED";

  return {
    status,
    passedRules,
    violatedRules,
    deterministicReason: `Policy evaluation ${status}: ${violatedRules.join("; ")}`,
  };
}
