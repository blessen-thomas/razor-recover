# Implementation Plan: RazorRecover — Safe Autonomous Payment Recovery

**Branch**: `001-safe-payment-recovery` | **Date**: 2026-08-25 | **Spec**: [`specs/001-safe-payment-recovery/spec.md`](spec.md)

**Input**: Feature specification from [`specs/001-safe-payment-recovery/spec.md`](spec.md)

---

## Summary

Build RazorRecover as a modular full-stack Next.js monolith providing safe, autonomous payment recovery for merchants using Razorpay. The system ingests Razorpay webhooks, evaluates deterministic event integrity (`TRUSTED`, `STALE`, `DUPLICATE`, `OUT_OF_ORDER`, `INCOMPLETE`, `CONTRADICTORY`), synthesizes evidence via Gemini AI to propose bounded recommendations (`RETRY_NOW`, `RETRY_LATER`, `NO_ACTION`, `ESCALATE`), validates all decisions against an unoverridable deterministic policy engine (max 2 retries, 15-min cooldown, state eligibility), executes Razorpay test mode recovery actions (`POST /v1/payment_links`), reconciles API state upon failure, and presents a 7-step observable audit trail in a minimal operator UI.

---

## Technical Context

**Language/Version**: TypeScript / Node.js 18+  
**Primary Dependencies**: Next.js 14+ (App Router), React 19, `@google/genai` (or `ai` + `@ai-sdk/google`), `razorpay` (official Node SDK), Tailwind CSS, Lucide React  
**Storage**: Supabase / PostgreSQL (`payment_cases`, `payment_events`, `ai_investigations`, `policy_checks`, `recovery_actions`, `audit_log_entries`)  
**Testing**: Vitest / Jest + Supertest  
**Target Platform**: Web (Vercel / Node.js server)  
**Project Type**: Full-Stack Web Application (Modular Monolith)  
**Performance Goals**: Webhook ingestion response < 500ms; AI investigation + Policy check < 2s; UI audit panel rendering < 200ms  
**Constraints**: Zero financial action without explicit policy `APPROVED` status; Zero numeric trust scores in safety rules; No artificial metric fabrication  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked post-design.*

- [x] **Principle I (Safety Before Autonomy)**: Strictly enforced. Sequence is `LLM proposes → policy engine validates → system executes/blocks`. LLM has zero direct API access.
- [x] **Principle II (AI Genuine Value)**: AI is used specifically to synthesize complex multi-factor evidence timelines, not to summarize SQL or generate text labels.
- [x] **Principle III (Evidence Over Fabrication)**: Confidence scores eliminated; synthetic test data clearly identified.
- [x] **Principle IV (Failure First-Class)**: Duplicate, out-of-order, stale, and reconciliation failure paths built directly into database models and policy logic.
- [x] **Principle V (Meaningful Razorpay Integration)**: Uses real Razorpay Test Mode APIs (`POST /v1/payment_links`, `GET /v1/payments/{id}`) and HMAC webhook validation.
- [x] **Principle VI (Focused Scope)**: Strict 7-stage workflow implementation. No chatbots, what-if simulators, or broad merchant analytics.
- [x] **Principle VII (Observable Decisions)**: Structured audit log table (`audit_log_entries`) storing all 7 workflow stages for every case.
- [x] **Principle VIII (Deterministic Financial Controls)**: Hardcoded `POLICY_BOUNDS` in TypeScript. LLM cannot override retry limits or cooldowns.
- [x] **Principle IX (Testability)**: Modular TypeScript engine testable via unit and integration tests without UI dependencies.
- [x] **Principle X (Honest Demonstration)**: Relies exclusively on working test-mode code.
- [x] **Principle XI (5-Minute Pitch)**: Direct alignment with 7-step pitch sequence.
- [x] **Principle XII (Simplicity)**: Modular monolith architecture in Next.js. No microservices or external background queues.

---

## Project Structure & Component Architecture

```text
src/
├── app/
│   ├── api/
│   │   ├── webhooks/razorpay/route.ts      # Webhook Receiver & Signature Validation
│   │   ├── cases/route.ts                  # Operator UI Case List API
│   │   ├── cases/[id]/route.ts             # Operator UI Case Audit Trail API
│   │   └── cases/[id]/reconcile/route.ts   # State Reconciliation API
│   ├── cases/
│   │   ├── page.tsx                        # Operator Cases List View
│   │   └── [id]/page.tsx                   # Case Audit Trail & Detail View
│   └── page.tsx                            # System Safety Dashboard Home
├── lib/
│   ├── recovery/
│   │   ├── event-evaluator.ts              # Deterministic Event Integrity Evaluator
│   │   ├── ai-investigator.ts              # Gemini AI Evidence Synthesizer
│   │   ├── policy-engine.ts                # Deterministic Policy Safety Rules
│   │   ├── recovery-executor.ts            # Razorpay Test Mode API Client
│   │   ├── reconciliation-engine.ts        # State Reconciliation & Failure Handler
│   │   └── audit-logger.ts                 # Immutable Audit Logger
│   ├── razorpay.ts                         # Razorpay SDK Singleton & Signature Helper
│   └── db.ts                               # Supabase / DB Client Connection
└── tests/
    ├── unit/
    │   ├── policy-engine.test.ts           # Policy Rule Validation Tests
    │   └── event-evaluator.test.ts         # Event Integrity Tests
    └── integration/
        ├── webhook-flow.test.ts            # End-to-End Webhook Ingestion Tests
        └── reconciliation.test.ts          # Reconciliation Failure Handling Tests
```

---

## Technical Approach & Component Breakdown

### 1. Webhook Ingestion & Event Integrity Evaluator (`event-evaluator.ts`)
- Ingests `payment.failed`, `payment.authorized`, `payment.captured`.
- Validates `X-Razorpay-Signature` HMAC SHA256.
- Queries `payment_events` DB to detect duplicate `event_id` or timestamp skew (>1h).
- Assigns integrity state: `TRUSTED`, `STALE`, `DUPLICATE`, `OUT_OF_ORDER`, `INCOMPLETE`, `CONTRADICTORY`.

### 2. AI Investigation Engine (`ai-investigator.ts`)
- Builds evidence payload (event sequence, method, error code, timestamp delta).
- Invokes Gemini API via structured output schema (`generateObject`).
- Produces bounded recommendation (`RETRY_NOW`, `RETRY_LATER`, `NO_ACTION`, `ESCALATE`) + reasoning text.

### 3. Deterministic Policy Safety Engine (`policy-engine.ts`)
- Input: Case history, retry count, last retry timestamp, integrity state, AI recommendation.
- Evaluates rules:
  1. `INTEGRITY_CHECK`: State must be `TRUSTED`.
  2. `MAX_RETRIES`: Retry count must be < 2.
  3. `COOLDOWN`: Minimum 15-minute gap since `last_retry_at`.
  4. `STATE_ELIGIBILITY`: Current status must be recoverable `DETECTED`/`FAILED`.
- Output: `APPROVED`, `BLOCKED`, or `ESCALATED` + explicit rule violations.

### 4. Recovery Action Executor (`recovery-executor.ts`)
- Dispatches ONLY when policy check status is `APPROVED`.
- Calls `razorpay.paymentLink.create({...})` in Test Mode.
- Logs request/response in `recovery_actions` table and updates `payment_cases` status to `RECOVERY_INITIATED`.

### 5. Reconciliation Engine (`reconciliation-engine.ts`)
- Triggers on `INCOMPLETE`/`STALE` state or manual operator action.
- Queries `razorpay.payments.fetch(paymentId)`.
- If API call succeeds: Updates local event log, sets integrity to `TRUSTED`, re-evaluates policy.
- If API call fails/times out: Preserves local history intact, logs reconciliation error, applies exponential backoff retry (max 3), sets safety state to `AWAITING_RECONCILIATION`.

### 6. Operator UI (`src/app/cases/`)
- Minimal, high-impact operator interface:
  - System Safety Badge (`ACTIVE`, `PAUSED`, `BLOCKED`, `AWAITING_RECONCILIATION`, `ESCALATED`).
  - Active Recovery Cases table.
  - 7-Step Case Audit Panel showing raw events, AI investigation, policy check rules, executed recovery action, and measured outcome.

---

## Verification & Testing Plan

### Automated Tests
- `npm test`: Run Vitest unit tests for:
  - Policy Engine (`MAX_RETRIES` override, `COOLDOWN` override, `INTEGRITY_CHECK` failure).
  - Integrity Evaluator (`DUPLICATE` detection, `OUT_OF_ORDER` timestamp detection).
- `npm run test:integration`: Run API integration tests for:
  - Valid webhook Happy Path.
  - Contradictory webhook Unsafe Path (Safety Halt).
  - Reconciliation API failure & safe state preservation.

### Manual Verification
- Execute `npm run seed:happy-path`, `npm run seed:unsafe-path`, `npm run seed:reconcile-path`.
- Verify operator dashboard visuals and audit trail step details.
