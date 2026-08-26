import { NextRequest, NextResponse } from "next/server";
import { reconcilePaymentCase } from "@/lib/recovery/reconciliation-engine";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const caseId = params.id;
    const result = await reconcilePaymentCase(caseId);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "RECONCILIATION_ERROR" }, { status: 500 });
  }
}
