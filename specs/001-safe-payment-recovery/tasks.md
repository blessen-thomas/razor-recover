# Tasks: RazorRecover — Safe Autonomous Payment Recovery

**Feature Branch**: `001-safe-payment-recovery`  
**Feature Specification**: [`specs/001-safe-payment-recovery/spec.md`](spec.md)  
**Implementation Plan**: [`specs/001-safe-payment-recovery/plan.md`](plan.md)  

---

## Dependency Graph & Implementation Strategy

```
Phase 1: Project Setup (T001-T004)
        │
        ▼
Phase 2: Infrastructure & Foundational Layer (T005-T008)
        │
        ▼
Phase 3: User Story 1 (P1) — Detection & Policy-Checked Recovery (T009-T016) [MVP HAPPY PATH]
        │
   ┌────┴────────────────────────┬────────────────────────┐
   ▼                             ▼                        ▼
Phase 4: User Story 2 (P2)   Phase 5: User Story 3 (P3)  Phase 6: User Story 4 (P4)
Unsafe State & Halt          State Reconciliation        Policy Hard Rule Overrides
(T017-T020)                  & API Failures (T021-T024)   (T025-T027)
   │                             │                        │
   └────┬────────────────────────┴────────────────────────┘
        ▼
Phase 7: User Story 5 (P5) — Observable Operator UI & Audit Trail (T028-T031)
        │
        ▼
Phase 8: Polish, Demo Seeders & 5-Minute Pitch Verification (T032-T035)
```

---

## Phase 1: Setup (Project & Environment Initialization)

Goal: Establish the base repository structure, package dependencies, environment configurations, and test runners.

- [x] T001 Initialize Next.js 14+ App Router project structure with TypeScript and Tailwind CSS in root directory `d:/project/razor-recover`
- [x] T002 [P] Install core dependencies (`razorpay`, `@supabase/supabase-js`, `@google/generative-ai`, `zod`, `lucide-react`) in `package.json`
- [x] T003 [P] Configure environment variable validation schema in `src/lib/env.ts` (`DATABASE_URL`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `GEMINI_API_KEY`)
- [x] T004 [P] Configure Vitest test runner and setup file in `vitest.config.ts` and `src/tests/setup.ts`

---

## Phase 2: Foundational Infrastructure (Blocking Prerequisites)

Goal: Set up database tables, database connection, Razorpay SDK singleton, and webhook signature verification before implementing user flows.

- [x] T005 Create Supabase / PostgreSQL database migration script for core tables (`payment_cases`, `payment_events`, `ai_investigations`, `policy_checks`, `recovery_actions`, `audit_log_entries`) in `supabase/migrations/001_initial_schema.sql`
- [x] T006 Create DB client connection helper in `src/lib/db.ts`
- [x] T007 [P] Create Razorpay SDK client singleton and HMAC SHA256 webhook signature validator in `src/lib/razorpay.ts`
- [x] T008 [P] Create immutable audit trail logger service in `src/lib/recovery/audit-logger.ts`

---

## Phase 3: User Story 1 (Priority: P1) — Detection & Policy-Checked Recovery (MVP Happy Path)

Goal: Implement the complete end-to-end happy path: ingest `payment.failed` event, evaluate `TRUSTED` integrity, synthesize AI recommendation, approve via policy engine, execute Razorpay Payment Link creation (`POST /v1/payment_links`), and record outcome.

**Independent Test**: Simulate Razorpay `payment.failed` webhook with valid state, verify AI synthesis, check policy approval (`APPROVED`), verify payment link creation, and inspect case state `RECOVERY_INITIATED`.

- [x] T009 [US1] Create unit tests for happy path policy evaluation in `src/tests/unit/policy-engine-happy.test.ts`
- [x] T010 [P] [US1] Implement Event Integrity Evaluator for `TRUSTED` state in `src/lib/recovery/event-evaluator.ts`
- [x] T011 [P] [US1] Implement Gemini AI Evidence Synthesizer returning bounded JSON decisions in `src/lib/recovery/ai-investigator.ts`
- [x] T012 [P] [US1] Implement Deterministic Policy Safety Engine checking retry limits and cooldown in `src/lib/recovery/policy-engine.ts`
- [x] T013 [US1] Implement Razorpay Test Mode Payment Link executor (`POST /v1/payment_links`) in `src/lib/recovery/recovery-executor.ts`
- [x] T014 [US1] Implement Webhook Route Handler in `src/app/api/webhooks/razorpay/route.ts` orchestrating 7-step happy path
- [x] T015 [US1] Write integration test for Happy Path Webhook Flow in `src/tests/integration/happy-path.test.ts`
- [x] T016 [US1] Create seed script for Happy Path demo scenario in `scripts/seed-happy-path.ts`

---

## Phase 4: User Story 2 (Priority: P2) — Event Inconsistency & Safety Halt (Unsafe Path)

Goal: Detect duplicate, out-of-order, or contradictory event streams and immediately halt autonomous recovery.

**Independent Test**: Inject out-of-order event sequence (e.g. `payment.captured` before `payment.failed` or duplicate webhook IDs), verify state marked `CONTRADICTORY`/`DUPLICATE`, policy returns `BLOCKED`/`ESCALATED`, and recovery action is suppressed.

- [x] T017 [US2] Create unit tests for event inconsistency states in `src/tests/unit/event-evaluator-unsafe.test.ts`
- [x] T018 [P] [US2] Extend Event Integrity Evaluator to detect `DUPLICATE`, `OUT_OF_ORDER`, `STALE`, and `CONTRADICTORY` payloads in `src/lib/recovery/event-evaluator.ts`
- [x] T019 [US2] Update Policy Engine to block/escalate cases with non-`TRUSTED` integrity states in `src/lib/recovery/policy-engine.ts`
- [x] T020 [US2] Create integration test for Unsafe Event Escalation Flow in `src/tests/integration/unsafe-path.test.ts`

---

## Phase 5: User Story 3 (Priority: P3) — Webhook Failure Reconciliation & Resumption (Failure Path)

Goal: Query Razorpay API `GET /v1/payments/{id}` to reconcile transaction state after webhook delays—or safely pause if reconciliation fails.

**Independent Test**: Ingest incomplete transaction, transition state to `AWAITING_RECONCILIATION`, trigger API state fetch, verify state update to `TRUSTED`, and resume recovery. Test API timeout scenario to verify history preservation and safe pause persistence.

- [x] T021 [US3] Implement Reconciliation Engine for Razorpay API state fetch in `src/lib/recovery/reconciliation-engine.ts`
- [x] T022 [US3] Implement Reconciliation Failure & Timeout Handler preserving history and scheduling retry backoff in `src/lib/recovery/reconciliation-engine.ts`
- [x] T023 [P] [US3] Implement Reconciliation API Endpoint `POST /api/cases/[id]/reconcile/route.ts`
- [x] T024 [US3] Write integration test for Reconciliation Engine and API failure handling in `src/tests/integration/reconciliation.test.ts`

---

## Phase 6: User Story 4 (Priority: P4) — Deterministic Policy Safety Override (Hard Rules)

Goal: Enforce hard financial control rules (max 2 retries, 15-minute cooldown) that override any AI recommendation.

**Independent Test**: Inject AI recommendation `RETRY_NOW` for a case exceeding 2 retries or within 15-min cooldown, verify policy engine overrides with `BLOCKED`, and confirm zero API execution.

- [x] T025 [US4] Implement Retry Limit (<2) and Cooldown (15 min) validation rules in `src/lib/recovery/policy-engine.ts`
- [x] T026 [US4] Create unit test suite verifying policy engine overrides AI recommendations in `src/tests/unit/policy-override.test.ts`
- [x] T027 [US4] Update audit logger to record deterministic policy override reason in `src/lib/recovery/audit-logger.ts`

---

## Phase 7: User Story 5 (Priority: P5) — Observable Operator UI & Audit Trail

Goal: Build a focused merchant dashboard displaying live system safety state badges (`ACTIVE`, `PAUSED`, `BLOCKED`, `AWAITING_RECONCILIATION`, `ESCALATED`) and an interactive 7-step visual audit trail panel.

**Independent Test**: Navigate to `/cases/[id]`, inspect raw events, AI investigation output, policy check rules, executed actions, and measured outcomes.

- [x] T028 [US5] Implement Operator Cases List REST API `GET /api/cases/route.ts` and Case Audit REST API `GET /api/cases/[id]/route.ts`
- [x] T029 [P] [US5] Build Operator Cases List page showing safety state badges and active cases in `src/app/cases/page.tsx`
- [x] T030 [P] [US5] Build Interactive 7-Step Case Audit Trail view in `src/app/cases/[id]/page.tsx`
- [x] T031 [US5] Build System Safety State Dashboard Header Component in `src/components/safety-header.tsx`

---

## Phase 8: Polish, Seeders & 5-Minute Pitch Verification

Goal: Finalize demo seed scripts, verify pitch workflow scenarios, and ensure zero regressions.

- [x] T032 Create CLI seeder for Unsafe Contradiction demo scenario in `scripts/seed-unsafe-path.ts`
- [x] T033 Create CLI seeder for Webhook Reconciliation demo scenario in `scripts/seed-reconcile-path.ts`
- [x] T034 Add demo seeder shortcut commands (`npm run seed:happy-path`, `npm run seed:unsafe-path`, `npm run seed:reconcile-path`) in `package.json`
- [x] T035 [P] Run complete automated test suite (`npm test`) and verify 5-minute pitch walkthrough
