import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../env";
import { PaymentCaseRecord, PaymentEventRecord } from "../db";

export type AIDecision = "RETRY_NOW" | "RETRY_LATER" | "NO_ACTION" | "ESCALATE";

export interface AIInvestigationResult {
  evidenceSummary: {
    paymentId: string;
    amount: number;
    currency: string;
    errorCode?: string | null;
    errorDescription?: string | null;
    retryCount: number;
    integrityState: string;
    eventCount: number;
  };
  proposedDecision: AIDecision;
  reasoning: string;
  riskFactors: string[];
}

let genAIClient: GoogleGenerativeAI | null = null;

function getGenAI(apiKey: string): GoogleGenerativeAI {
  if (!genAIClient) {
    genAIClient = new GoogleGenerativeAI(apiKey);
  }
  return genAIClient;
}

export async function investigatePaymentCase(
  paymentCase: PaymentCaseRecord,
  events: PaymentEventRecord[]
): Promise<AIInvestigationResult> {
  const evidenceSummary = {
    paymentId: paymentCase.razorpay_payment_id,
    amount: paymentCase.amount,
    currency: paymentCase.currency,
    errorCode: paymentCase.error_code,
    errorDescription: paymentCase.error_description,
    retryCount: paymentCase.retry_count,
    integrityState: paymentCase.integrity_state,
    eventCount: events.length,
  };

  // Check if real Gemini key is available
  if (env.GEMINI_API_KEY && !env.GEMINI_API_KEY.includes("Mock")) {
    try {
      const genAI = getGenAI(env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `You are RazorRecover's AI Payment Recovery Investigator.
Analyze the following payment failure evidence and return a JSON object with:
- "proposedDecision": strictly one of ["RETRY_NOW", "RETRY_LATER", "NO_ACTION", "ESCALATE"]
- "reasoning": 1-3 sentence evidence-based explanation
- "riskFactors": array of identified risk strings

EVIDENCE:
${JSON.stringify(evidenceSummary, null, 2)}
Respond ONLY with raw valid JSON, no markdown formatting.`;

      const response = await model.generateContent(prompt);
      const text = response.response.text();

      if (text) {
        const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanedText);
        if (parsed.proposedDecision && ["RETRY_NOW", "RETRY_LATER", "NO_ACTION", "ESCALATE"].includes(parsed.proposedDecision)) {
          return {
            evidenceSummary,
            proposedDecision: parsed.proposedDecision as AIDecision,
            reasoning: parsed.reasoning || "AI synthesis based on payment error code and timeline.",
            riskFactors: parsed.riskFactors || [],
          };
        }
      }
    } catch (err) {
      console.warn("Gemini API call failed, falling back to rule-based synthesis:", err);
    }
  }

  // Deterministic AI synthesis fallback (when Gemini API key is mock or unavailable)
  let decision: AIDecision = "RETRY_NOW";
  let reasoning = "Payment failure indicates temporary network/bank authorization error; retry recommended.";
  const riskFactors: string[] = [];

  if (paymentCase.integrity_state !== "TRUSTED") {
    decision = "ESCALATE";
    reasoning = `Unreliable event integrity state (${paymentCase.integrity_state}). Autonomous recovery must escalate.`;
    riskFactors.push("UNRELIABLE_EVENT_INTEGRITY");
  } else if (paymentCase.retry_count >= 2) {
    decision = "NO_ACTION";
    reasoning = `Maximum retry attempts (${paymentCase.retry_count}) reached for transaction.`;
    riskFactors.push("MAX_RETRIES_EXCEEDED");
  } else if (paymentCase.error_code === "BAD_REQUEST_ERROR" || paymentCase.error_code === "GATEWAY_ERROR") {
    decision = "RETRY_NOW";
    reasoning = `Transient gateway/bank error (${paymentCase.error_code}). Instant recovery link generation recommended.`;
  }

  return {
    evidenceSummary,
    proposedDecision: decision,
    reasoning,
    riskFactors,
  };
}
