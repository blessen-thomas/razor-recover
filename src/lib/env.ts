import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().default("postgresql://postgres:postgres@localhost:5432/razor_recover"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().default("https://example.supabase.co"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().default("example-anon-key"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default("example-service-role-key"),
  RAZORPAY_KEY_ID: z.string().default("rzp_test_mockkeyid123"),
  RAZORPAY_KEY_SECRET: z.string().default("mockkeysecret456"),
  RAZORPAY_WEBHOOK_SECRET: z.string().default("whsec_mocksecret789"),
  GEMINI_API_KEY: z.string().default("AIzaSyMockGeminiKey123456789"),
});

export function getEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.warn("⚠️ Environment variable warning:", parsed.error.format());
    return envSchema.parse({});
  }
  return parsed.data;
}

export const env = getEnv();
