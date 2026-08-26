import crypto from "crypto";
import Razorpay from "razorpay";
import { env } from "./env";

let razorpayInstance: Razorpay | null = null;

export function getRazorpayClient(): Razorpay {
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayInstance;
}

/**
 * Validates Razorpay Webhook HMAC SHA256 Signature.
 * Returns true if valid, false otherwise.
 */
export function validateWebhookSignature(body: string, signature: string, secret: string = env.RAZORPAY_WEBHOOK_SECRET): boolean {
  if (!body || !signature || !secret) {
    return false;
  }
  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");
    
    // Constant time comparison to prevent timing attacks
    return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
  } catch (err) {
    console.error("Signature validation error:", err);
    return false;
  }
}
