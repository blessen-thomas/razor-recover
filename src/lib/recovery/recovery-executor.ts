import { getRazorpayClient } from "../razorpay";
import { memoryStore, PaymentCaseRecord, RecoveryActionRecord } from "../db";
import { PolicyEvaluationResult } from "./policy-engine";

export interface RecoveryExecutionResult {
  success: boolean;
  actionRecord: RecoveryActionRecord;
  error?: string;
}

export async function executeRecoveryAction(
  paymentCase: PaymentCaseRecord,
  policyCheckId: string,
  policyResult: PolicyEvaluationResult
): Promise<RecoveryExecutionResult> {
  // CRITICAL CONSTITUTIONAL SAFETY CHECK: MUST BE APPROVED
  if (policyResult.status !== "APPROVED") {
    throw new Error(`FINANCIAL SAFETY VIOLATION: Cannot execute recovery action when policy check status is ${policyResult.status}.`);
  }

  const razorpay = getRazorpayClient();
  const requestPayload = {
    amount: Math.round(paymentCase.amount * 100), // Razorpay amount in paise
    currency: paymentCase.currency || "INR",
    accept_partial: false,
    description: `RazorRecover Payment Link for failed payment ${paymentCase.razorpay_payment_id}`,
    customer: {
      name: "Valued Merchant Customer",
      email: paymentCase.customer_email || "customer@example.com",
      contact: paymentCase.customer_phone || "+919876543210",
    },
    notify: {
      email: true,
      sms: false,
    },
    reminder_enable: true,
    notes: {
      recovery_case_id: paymentCase.id,
      original_payment_id: paymentCase.razorpay_payment_id,
    },
  };

  let razorpayEntityId: string = `plink_test_${crypto.randomUUID().slice(0, 8)}`;
  let apiResponsePayload: any = null;
  let isSuccess = false;

  try {
    // Attempt real Razorpay API Payment Link creation
    if (process.env.RAZORPAY_KEY_ID && !process.env.RAZORPAY_KEY_ID.includes("mock")) {
      const link = await razorpay.paymentLink.create(requestPayload as any);
      razorpayEntityId = link.id;
      apiResponsePayload = link;
      isSuccess = true;
    } else {
      // Test mode mock response
      apiResponsePayload = {
        id: razorpayEntityId,
        entity: "payment_link",
        amount: requestPayload.amount,
        currency: requestPayload.currency,
        status: "created",
        short_url: `https://rzp.io/i/${razorpayEntityId.slice(6)}`,
        created_at: Math.floor(Date.now() / 1000),
      };
      isSuccess = true;
    }
  } catch (err: any) {
    console.warn("Razorpay API call failed:", err);
    apiResponsePayload = { error: err.message || "API call failed" };
    isSuccess = false;
  }

  const actionRecord: RecoveryActionRecord = {
    id: crypto.randomUUID(),
    case_id: paymentCase.id,
    policy_check_id: policyCheckId,
    action_type: "CREATE_PAYMENT_LINK",
    razorpay_entity_id: razorpayEntityId,
    api_request_payload: requestPayload,
    api_response_payload: apiResponsePayload,
    status: isSuccess ? "SUCCESS" : "FAILED",
    executed_at: new Date().toISOString(),
  };

  // Update memory store
  memoryStore.recoveryActions.set(actionRecord.id, actionRecord);

  // Update case retry count & status
  paymentCase.retry_count += 1;
  paymentCase.last_retry_at = new Date().toISOString();
  paymentCase.current_status = isSuccess ? "RECOVERY_INITIATED" : "FAILED";
  paymentCase.updated_at = new Date().toISOString();
  memoryStore.cases.set(paymentCase.id, paymentCase);

  return {
    success: isSuccess,
    actionRecord,
    error: isSuccess ? undefined : apiResponsePayload?.error,
  };
}
