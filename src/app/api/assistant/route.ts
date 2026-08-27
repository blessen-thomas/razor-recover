import { NextRequest, NextResponse } from "next/server";
import { processMerchantQuery } from "@/lib/assistant/assistant-engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const message = body.message;
    const caseId = body.caseId;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "Message is required." },
        { status: 400 }
      );
    }

    const result = await processMerchantQuery(message, caseId);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Assistant API Error:", err);
    return NextResponse.json(
      {
        error: "ASSISTANT_ERROR",
        answer: "An error occurred while processing your request. Please try again.",
      },
      { status: 500 }
    );
  }
}
