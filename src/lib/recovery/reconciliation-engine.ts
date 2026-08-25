import { getRazorpayClient } from "../razorpay";
import { memoryStore, PaymentCaseRecord } from "../db";
import { logAuditEntry } from "./audit-logger";

export interface ReconciliationResult {
  status: "RECONCILED" | "RECONCILIATION_FAILED";
  previousIntegrityState: string;
  newIntegrityState: string;
  razorpayPaymentStatus?: string;
  error?: string;
  retryCount?: number;
}

export async function reconcilePaymentCase(caseId: string): Promise<ReconciliationResult> {
  const paymentCase = memoryStore.cases.get(caseId);
  if (!paymentCase) {
    throw new Error(`Payment case ${caseId} not found.`);
  }

  const previousIntegrity = paymentCase.integrity_state;
  let razorpayStatus: string | undefined;

  try {
    // Attempt Razorpay API state fetch
    if (process.env.RAZORPAY_KEY_ID && !process.env.RAZORPAY_KEY_ID.includes("mock")) {
      const razorpay = getRazorpayClient();
      const paymentData: any = await razorpay.payments.fetch(paymentCase.razorpay_payment_id);
      razorpayStatus = paymentData.status;
    } else {
      // Test mode mock reconciliation fetch
      razorpayStatus = "failed";
    }

    // Success path: Authoritative state fetched
    paymentCase.integrity_state = "TRUSTED";
    paymentCase.safety_state = "ACTIVE";
    paymentCase.updated_at = new Date().toISOString();
    memoryStore.cases.set(caseId, paymentCase);

    await logAuditEntry(caseId, { number: 6, name: "Reconcile", actor: "RECONCILIATION_ENGINE" }, {
      status: "RECONCILED",
      previousIntegrity,
      newIntegrity: "TRUSTED",
      razorpayStatus,
    });

    return {
      status: "RECONCILED",
      previousIntegrityState: previousIntegrity,
      newIntegrityState: "TRUSTED",
      razorpayPaymentStatus: razorpayStatus,
    };
  } catch (err: any) {
    // Failure path: Razorpay API timeout or error
    // PRESERVE EXISTING TRANSACTION HISTORY INTACT
    console.warn(`Reconciliation failed for case ${caseId}:`, err.message);

    paymentCase.safety_state = "AWAITING_RECONCILIATION";
    paymentCase.updated_at = new Date().toISOString();
    memoryStore.cases.set(caseId, paymentCase);

    await logAuditEntry(caseId, { number: 6, name: "Reconcile", actor: "RECONCILIATION_ENGINE" }, {
      status: "RECONCILIATION_FAILED",
      error: err.message || "RAZORPAY_API_TIMEOUT",
      safety_state: "AWAITING_RECONCILIATION",
      note: "Transaction history preserved. Case remains safely paused.",
    });

    return {
      status: "RECONCILIATION_FAILED",
      previousIntegrityState: previousIntegrity,
      newIntegrityState: previousIntegrity,
      error: err.message || "RAZORPAY_API_TIMEOUT",
      retryCount: 1,
    };
  }
}
