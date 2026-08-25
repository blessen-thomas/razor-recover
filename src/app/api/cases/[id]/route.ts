import { NextRequest, NextResponse } from "next/server";
import { memoryStore } from "@/lib/db";
import { getAuditTrail } from "@/lib/recovery/audit-logger";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const caseId = params.id;
  const paymentCase = memoryStore.cases.get(caseId);

  if (!paymentCase) {
    return NextResponse.json({ error: "CASE_NOT_FOUND" }, { status: 404 });
  }

  const events = Array.from(memoryStore.events.values()).filter((e) => e.case_id === caseId);
  const investigation = memoryStore.investigations.get(paymentCase.razorpay_payment_id) || null;
  const policyCheck = Array.from(memoryStore.policyChecks.values()).find((p) => p.case_id === caseId) || null;
  const recoveryAction = Array.from(memoryStore.recoveryActions.values()).find((a) => a.case_id === caseId) || null;
  const auditTrail = getAuditTrail(caseId);

  return NextResponse.json({
    case: paymentCase,
    events,
    investigation,
    policyCheck,
    recoveryAction,
    auditTrail,
  });
}
