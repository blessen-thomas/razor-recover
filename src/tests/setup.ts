import { beforeAll } from "vitest";

beforeAll(() => {
  process.env.RAZORPAY_KEY_ID = "rzp_test_mockkeyid123";
  process.env.RAZORPAY_KEY_SECRET = "mockkeysecret456";
  process.env.RAZORPAY_WEBHOOK_SECRET = "whsec_mocksecret789";
  process.env.GEMINI_API_KEY = "AIzaSyMockGeminiKey123456789";
});
