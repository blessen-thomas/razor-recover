# Research & Technical Decisions: RazorRecover

**Feature Branch**: `001-safe-payment-recovery`  
**Date**: 2026-08-25  

## 1. Monolith vs Microservices Architecture

- **Decision**: Modular Full-Stack Monolith using Next.js (TypeScript, App Router).
- **Rationale**:
  - RazorRecover is focused on a tight 7-step pipeline: `Detect → Investigate → Decide → Policy Check → Act/Escalate → Reconcile → Measure`.
  - A modular monolith eliminates IPC network overhead, deployment complexity, and distributed transaction state inconsistencies.
  - Keeps all 7 pipeline components in a single, strictly organized directory structure (`src/lib/recovery/*`), fulfilling Constitution Principle XII (Simplicity Over Unnecessary Complexity).
- **Alternatives Considered**:
  - *Microservices / Worker Queue Cluster*: Rejected due to unnecessary operational complexity for a buildathon prototype.

---

## 2. Technology Stack Selection

### 2.1 Framework & API Layer
- **Decision**: Next.js 14+ (App Router) + TypeScript + Tailwind CSS.
- **Rationale**:
  - API Routes provide serverless/server endpoints for Webhook ingestion (`POST /api/webhooks/razorpay`), Reconciliation triggers (`POST /api/recovery/reconcile`), and Operator UI endpoints (`GET /api/cases`).
  - Next.js Server Components and React state provide a responsive operator dashboard without heavy client state frameworks.

### 2.2 Database & Persistence
- **Decision**: Supabase (PostgreSQL) using `@supabase/supabase-js` or Prisma ORM.
- **Rationale**:
  - Relational schema is ideal for transactions, event streams, policy logs, and audit trails requiring foreign key constraints and ACID guarantees.
  - Provides instant REST API and realtime subscriptions if operator UI live updates are needed.

### 2.3 Razorpay SDK Integration
- **Decision**: `razorpay` official Node.js SDK + native Node `crypto` for HMAC signature validation.
- **Rationale**:
  - Real Razorpay API Test Mode endpoints:
    - Customer Payment Link Creation: `razorpay.paymentLink.create({...})` (`POST /v1/payment_links`)
    - Payment Details Fetch: `razorpay.payments.fetch(paymentId)` (`GET /v1/payments/{id}`)
    - Webhook Signature Check: `Razorpay.validateWebhookSignature(body, signature, secret)`
  - Guarantees authentic Razorpay API integration without inventing unsupported API endpoints.

### 2.4 AI Investigation Engine
- **Decision**: Vercel AI SDK (`ai` + `@ai-sdk/google`) or `@google/genai` (Gemini 2.5 Flash / 1.5 Flash).
- **Rationale**:
  - Provides structured JSON output generation (`generateObject` with Zod schema validation).
  - Rapid response latency (~500ms - 1.2s) for evidence synthesis.
  - Bounded outputs (`RETRY_NOW`, `RETRY_LATER`, `NO_ACTION`, `ESCALATE`) enforced by Zod schemas. Zero numeric trust scores.

### 2.5 Deterministic Policy Engine
- **Decision**: Pure TypeScript module (`src/lib/recovery/policy-engine.ts`).
- **Rationale**:
  - Synchronous, deterministic, unit-testable evaluation.
  - Enforces hard rules (max 2 retries, 15-min cooldown, state eligibility, `TRUSTED` integrity state, duplicate guard).
  - Completely isolated from LLM output—LLM recommendations cannot alter policy rule evaluation.

---

## 3. Failure Mode & Event Integrity Research

| Failure Scenario | Detection Mechanism | System Action & Policy Output |
|---|---|---|
| **Duplicate Webhook** | Existing `event_id` in `payment_events` DB table | Mark integrity `DUPLICATE`, log duplicate event, return policy `BLOCKED` (`"DUPLICATE_EVENT_DETECTED"`). |
| **Out-of-Order Events** | Event sequence mismatch (e.g., `payment.captured` before `payment.failed`) | Mark integrity `OUT_OF_ORDER`, return policy `ESCALATED`, halt autonomous recovery, alert operator. |
| **Stale Event Payload** | Payload timestamp > 1 hour older than system time | Mark integrity `STALE`, return policy `BLOCKED`, set case state to `AWAITING_RECONCILIATION`. |
| **Missing Webhook Gap** | Transaction state incomplete (e.g., pending authorization with missing failure/capture event > 15 mins) | Mark integrity `INCOMPLETE`, trigger API state fetch via Reconciliation Engine. |
| **Reconciliation API Error / Timeout** | Razorpay API returns 5xx or network timeout during fetch | Preserve local history intact, record reconciliation error, schedule bounded backoff retry (max 3), remain in `AWAITING_RECONCILIATION`. |

---

## 4. Testability & Quality Verification

- **Unit Testing**: Vitest / Jest for Policy Engine rules, Event Integrity Evaluator, and Zod Schema validators.
- **Integration Testing**: Supertest / Next API route test fixtures simulating valid webhooks, out-of-order payloads, duplicate payloads, and mocked Razorpay API timeouts.
