# RazorRecover — Safe Autonomous Payment Recovery

RazorRecover is a safety-aware payment recovery system built for the Razorpay ecosystem. It monitors failed payments, synthesizes payment failure evidence, evaluates un-overridable deterministic policy rules, and autonomously executes recovery actions **only when it is provably safe**. If an incoming event stream contains contradictory state (e.g., a failure payload arriving after a payment was already captured) or stale payload data, RazorRecover automatically halts recovery, safely blocks duplicate charges, and pauses for operator reconciliation.

---

## 🚀 Live Demo

[Try RazorRecover →](https://razor-recover.vercel.app)

*Note: This is a live demonstration environment featuring interactive test scenarios (Autonomous Recovery, Safety Halt, and Stale Reconciliation) using simulated payment recovery flows and test mode gateway payloads.*

---

## Problem

Payment failures in e-commerce and fintech lead to lost revenue, customer churn, and operational overhead. However, standard automated retry systems suffer from critical safety risks:

- **Blind Retries & Duplicate Charges**: Automatically resending payment links or retrying transactions without validating sequence history can result in double-charging customers who already succeeded.
- **Contradictory Event Streams**: Webhook events can arrive out of order or contradict merchant state (e.g., a `payment.failed` event delivered late after a successful `payment.captured` event).
- **Stale Payload Data**: Delayed webhooks may contain outdated payment status, leading to incorrect recovery actions if acted upon blindly.
- **Lack of Auditability**: Automated systems often lack granular, step-by-step audit logs showing why a specific payment recovery action was taken or suppressed.

---

## Solution

RazorRecover solves these challenges by combining AI-powered evidence synthesis with an un-overridable, deterministic policy engine:

1. **Detect**: Ingests failed payment webhooks and validates payload integrity.
2. **Investigate**: Synthesizes payment failure evidence, error codes, and event history.
3. **Decide**: Proposes an initial recovery strategy.
4. **Policy Check**: Applies strict, un-overridable deterministic safety rules (retry limits, cooldown windows, integrity verification).
5. **Act or Escalate**: Executes autonomous payment link generation only if safety checks pass; suppresses action and escalates if unsafe.
6. **Reconcile**: Pauses stale transactions for authoritative gateway status reconciliation.
7. **Measure & Audit**: Records every step in a tamper-evident audit log.

---

## Key Features

- **Safe Autonomous Recovery**: Generates Razorpay payment recovery links automatically when all 5 deterministic safety rules pass.
- **Deterministic Safety Engine**: Enforces strict policy bounds (max 2 retries, 15-minute cooldown, `TRUSTED` state requirement).
- **Contradiction Detection**: Detects out-of-order or conflicting webhook streams and immediately blocks automated action.
- **Stale-State Reconciliation**: Automatically pauses outdated event payloads (> 1 hour old) pending direct API reconciliation.
- **7-Step Decision & Safety Pipeline**: Clear, linear execution flow visualizer for every transaction case.
- **Interactive Scenarios**: Instant launcher for testing Autonomous Recovery, Safety Halt, and Stale Reconciliation demo flows.
- **Operational Recovery Dashboard**: High-level KPI metrics tracking Revenue at Risk, Recovery in Progress, Attention Required, and Autonomous Action Rate.
- **Complete Audit Trail Log**: Detailed step-by-step execution logs with payload inspection for complete transparency.

---

## Demo Scenarios

RazorRecover features three built-in demo scenarios accessible directly from the dashboard header dropdown:

| Scenario | Amount | What Happened | Decision | Status | Outcome |
|---|---|---|---|---|---|
| **1. Autonomous Recovery** | ₹499.00 | Temporary payment failure | **Safe to recover** | Recovery in progress | Valid `payment.failed` payload passes all 5 policy rules; Razorpay recovery link generated. |
| **2. Safety Halt (Contradiction)** | ₹1,500.00 | Payment status conflict | **Recovery blocked** | Needs review | `payment.failed` received after `payment.captured`; policy engine halts execution to prevent duplicate charge. |
| **3. Stale Reconciliation** | ₹299.00 | Outdated payment information | **Reconcile** | Checking payment status | Stale payload (> 1 hour old) detected; autonomous action paused until direct gateway reconciliation API is triggered. |

---

## Architecture: 7-Step Recovery Pipeline

Every payment failure ingested by RazorRecover flows sequentially through the 7-step pipeline:

```
[1. Detect] ──► [2. Investigate] ──► [3. Decide] ──► [4. Policy Check] ──► [5. Act / Escalate] ──► [6. Reconcile] ──► [7. Measure]
 (WEBHOOK)       (AI_ENGINE)         (AI_ENGINE)     (POLICY_ENGINE)       (EXECUTOR)          (RECONCILE)         (SYSTEM)
```

1. **Detect (`WEBHOOK`)**: Validates webhook payload structure, signature, and timestamp.
2. **Investigate (`AI_ENGINE`)**: Analyzes error codes (`BAD_REQUEST_ERROR`, `GATEWAY_ERROR`), retry counts, and customer metadata.
3. **Decide (`AI_ENGINE`)**: Recommends recovery action (`RETRY_NOW`, `RETRY_LATER`, `NO_ACTION`, `ESCALATE`).
4. **Policy Check (`POLICY_ENGINE`)**: Evaluates un-overridable deterministic safety rules:
   - Rule 1: Integrity state MUST be `TRUSTED`.
   - Rule 2: Retry count MUST be `< 2`.
   - Rule 3: Cooldown period MUST be `≥ 15 minutes`.
   - Rule 4: Case status MUST be in an eligible state (`DETECTED`, `FAILED`, `RECOVERY_PENDING`).
   - Rule 5: Proposed AI decision MUST be aligned (`RETRY_NOW`).
5. **Act or Escalate (`EXECUTOR`)**: Executes Razorpay Payment Link creation if approved; suppresses action if blocked.
6. **Reconcile (`RECONCILE_ENGINE`)**: Syncs authoritative transaction state directly with Razorpay API when payloads are stale.
7. **Measure (`SYSTEM`)**: Records final operational outcome and metrics.

---

## Safety Model

> **CORE PRINCIPLE**: AUTONOMOUS ACTION IS ALLOWED ONLY WHEN THE PAYMENT STATE PASSES DETERMINISTIC SAFETY AND POLICY CHECKS.

RazorRecover never relies solely on AI recommendations or raw webhook events to initiate financial recovery. The deterministic policy engine holds absolute veto power over autonomous actions. Unsafe, contradictory, or stale cases are strictly blocked or paused for human operator review.

---

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18, Tailwind CSS, Lucide React
- **Language**: TypeScript
- **Validation**: Zod
- **SDKs**: `@google/generative-ai`, `razorpay`
- **Testing**: Vitest, `tsx`
- **Deployment**: Vercel

---

## Running Locally

### Prerequisites

- Node.js 18+ installed

### Installation & Setup

```bash
# Clone the repository
git clone https://github.com/blessen-thomas/razor-recover.git
cd razor-recover

# Install dependencies
npm install

# Start the Next.js development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or `http://localhost:3001` if port 3000 is occupied) in your browser.

---

## Seed Scripts

You can also run demo scenarios directly from the command line:

```bash
# Run Scenario 1 (Happy Path Autonomous Recovery)
npm run seed:happy-path

# Run Scenario 2 (Unsafe Contradictory Event Stream)
npm run seed:unsafe-path

# Run Scenario 3 (Stale Payload & API Reconciliation)
npm run seed:reconcile-path
```

---

## Testing

RazorRecover includes a comprehensive unit and integration test suite powered by Vitest:

```bash
# Run test suite
npm test
```

**Current Test Status**: 6 test files passed, 9 tests passed.

---

## Production Build

```bash
# Typecheck
npx tsc --noEmit

# Production build
npm run build
```

---

## Project Structure

```
razor-recover/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── api/                    # API Routes
│   │   │   ├── cases/              # Cases list & detail APIs
│   │   │   ├── seed/               # Demo scenario seed API
│   │   │   └── webhooks/razorpay/  # Webhook ingestion API
│   │   ├── cases/                  # Cases Dashboard & Case Detail Pages
│   │   │   ├── page.tsx            # Operational Recovery Dashboard
│   │   │   └── [id]/page.tsx       # Case Detail & Audit Log Visualizer
│   │   ├── globals.css             # Tailwind & Global Styles
│   │   ├── layout.tsx              # Root Layout
│   │   └── page.tsx                # Home Redirect
│   ├── components/                 # UI Components
│   │   └── safety-header.tsx       # Global Navigation & Safety Engine Status
│   ├── lib/                        # Core Business & Recovery Logic
│   │   ├── db.ts                   # In-Memory Store & Data Types
│   │   ├── env.ts                  # Zod Environment Validation
│   │   ├── razorpay.ts             # Razorpay SDK Client & Webhook Validation
│   │   └── recovery/               # 7-Step Recovery Pipeline Modules
│   │       ├── ai-investigator.ts  # Gemini AI Evidence Synthesis
│   │       ├── audit-logger.ts     # Audit Trail Logger
│   │       ├── event-evaluator.ts  # Webhook Integrity Evaluator
│   │       ├── policy-engine.ts    # Deterministic Safety Policy Engine
│   │       ├── reconciliation-engine.ts # Gateway Reconciliation Engine
│   │       └── recovery-executor.ts     # Razorpay Recovery Link Executor
│   └── tests/                      # Unit & Integration Tests
│       ├── integration/            # End-to-End Pipeline Tests
│       └── unit/                   # Policy & Evaluator Unit Tests
├── scripts/                        # CLI Seed Scripts
├── vitest.config.ts                # Vitest Configuration
├── tailwind.config.ts              # Tailwind CSS Configuration
└── package.json                    # Dependencies & Scripts
```

---

## Buildathon Context

RazorRecover was built for the **Razorpay Buildathon**.

*Disclaimer: RazorRecover is a demonstration application built for testing and hackathon presentation purposes. In test mode, payment links and recovery flows use Razorpay test mode credentials (`rzp_test_...`) and in-memory mock storage.*
