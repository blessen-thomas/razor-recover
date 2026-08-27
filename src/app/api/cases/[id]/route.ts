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

  const events: any[] = [];
  for (const e of memoryStore.events.values()) {
    if (e.case_id === caseId) events.push(e);
  }

  const investigation = memoryStore.investigations.get(paymentCase.razorpay_payment_id) || null;

  let policyCheck: any = null;
  for (const p of memoryStore.policyChecks.values()) {
    if (p.case_id === caseId) {
      policyCheck = p;
      break;
    }
  }

  let recoveryAction: any = null;
  for (const a of memoryStore.recoveryActions.values()) {
    if (a.case_id === caseId) {
      recoveryAction = a;
      break;
    }
  }

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
