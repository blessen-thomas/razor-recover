import { NextRequest, NextResponse } from "next/server";
import { memoryStore } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status");
  const safetyStateFilter = searchParams.get("safety_state");

  let cases = Array.from(memoryStore.cases.values());

  if (statusFilter) {
    cases = cases.filter((c) => c.current_status === statusFilter);
  }
  if (safetyStateFilter) {
    cases = cases.filter((c) => c.safety_state === safetyStateFilter);
  }

  // Sort descending by created_at
  cases.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return NextResponse.json({ cases });
}
