# Quickstart & Setup Guide: RazorRecover

**Feature Branch**: `001-safe-payment-recovery`  
**Date**: 2026-08-25  

## 1. Local Environment Requirements

- Node.js 18+ / pnpm or npm
- PostgreSQL or Supabase instance
- Razorpay API Test Mode credentials (Key ID & Key Secret from Razorpay Dashboard)
- Google Gemini API key (`GEMINI_API_KEY`) for AI evidence synthesis

---

## 2. Environment Configuration (`.env.local`)

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/razor_recover"
NEXT_PUBLIC_SUPABASE_URL="https://your-supabase.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# Razorpay Test Credentials
RAZORPAY_KEY_ID="rzp_test_xxxxxx"
RAZORPAY_KEY_SECRET="xxxxxx"
RAZORPAY_WEBHOOK_SECRET="whsec_xxxxxx"

# AI Provider
GEMINI_API_KEY="AIzaSyxxxxxx"
```

---

## 3. Running the Test Suite

```bash
# Run unit & policy engine tests
npm test

# Run integration tests for webhooks and failure reconciliation
npm run test:integration
```

---

## 4. Demonstrating the Core Workflow

1. Start development server: `npm run dev`
2. Open operator interface at `http://localhost:3000`
3. Trigger test webhook fixture:
   ```bash
   npm run seed:happy-path     # Triggers normal recovery
   npm run seed:unsafe-path    # Triggers contradictory webhook (safety halt)
   npm run seed:reconcile-path # Triggers missing event & reconciliation flow
   ```
4. Observe the live case updating through all 7 stages on the operator dashboard.
