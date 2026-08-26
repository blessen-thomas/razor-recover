<!--
SYNC IMPACT REPORT
- Version change: N/A -> 1.0.0
- Modified principles: Initialized 12 core project principles for RazorRecover.
- Added sections: Core Principles, Technical Direction & Scope Constraints, Governance.
- Templates requiring updates:
  - .specify/templates/plan-template.md (✅ aligned)
  - .specify/templates/spec-template.md (✅ aligned)
  - .specify/templates/tasks-template.md (✅ aligned)
- Follow-up TODOs: None.
-->

# RazorRecover Constitution

## Project Context
**RazorRecover — Safe Autonomous Payment Recovery**
Built for the Razorpay AI Buildathon. The project is optimized for problem taste, build quality, AI judgment, failure recovery, meaningful Razorpay API usage, demonstrable business impact, and a strong 5-minute pitch.

---

## Core Principles

### I. Safety Before Autonomy (NON-NEGOTIABLE)
RazorRecover MUST NEVER allow an LLM to directly execute financial or payment actions.
The architecture MUST strictly enforce the control sequence:
**LLM proposes → deterministic policy engine validates → system executes OR blocks/escalates.**
Every autonomous recovery action MUST pass through explicit, deterministic safety rules. When transaction state is uncertain, incomplete, stale, duplicated, or contradictory, the default behavior MUST be to **stop and escalate safely**, never guess.

### II. AI Must Provide Genuine Decision Value
AI MUST NOT be used merely to summarize database queries, generate dashboard text, rephrase deterministic rules, or add artificial "AI" labels to conventional logic.
The system MUST deploy AI specifically where ambiguous or conflicting evidence requires reasoning, synthesis, prioritization, or selection among bounded recovery strategies. Deterministic logic MUST remain strictly deterministic.

### III. Evidence Over Fabricated Intelligence
Never fabricate confidence percentages, recovery predictions, business metrics, historical performance, or financial outcomes.
If a recovery estimate is presented, it MUST be supported by an explicit, verifiable methodology (e.g., backtested historical results or a clearly defined simulation model). Synthetic data MUST be clearly identified as synthetic in all contexts.

### IV. Failure Is a First-Class Design Requirement
The system MUST be engineered to handle realistic payment-event failures, including duplicate, out-of-order, delayed, missing webhooks, and inconsistent transaction states.
The project MUST demonstrate at least one meaningful failure-and-recovery scenario. The system MUST fail safely and recover through reconciliation rather than blindly executing autonomous recovery actions.

### V. Meaningful Razorpay Integration
Razorpay APIs and webhook/event mechanisms MUST be used meaningfully in realistic payment and recovery workflows, including test-mode integration.
The project MUST NOT claim production capabilities or integrations that have not actually been implemented and tested.

### VI. Focused Scope
The system MUST optimize for one excellent end-to-end recovery workflow rather than a broad collection of shallow features.
The core workflow sequence MUST be:
**Detect → Investigate → Decide → Policy Check → Act or Escalate → Reconcile → Measure.**
Avoid unnecessary features that do not directly strengthen this core pipeline.

### VII. Observable Decisions
All significant AI and policy decisions MUST be explainable through structured evidence.
For every recovery decision, the system MUST be able to produce:
1. Relevant evidence gathered
2. Proposed action from LLM
3. Policy engine check result
4. Reason for approval or blocking
5. Resulting action executed or escalated
6. Resulting recovery outcome
Opaque "AI magic" is strictly forbidden.

### VIII. Deterministic Financial Controls
Financial safety controls MUST be implemented in deterministic application code, NOT in natural-language model instructions.
Required controls include: retry limits, eligibility rules, cooldown periods, transaction-state validation, duplicate-action prevention, and escalation triggers.
The LLM may recommend an action, but it CANNOT override deterministic safety controls.

### IX. Testability
Core recovery logic, safety rules, and policy evaluation MUST be testable independently of the UI.
Automated and integration tests MUST cover: normal recovery, blocked recovery, duplicate events, out-of-order events, stale transaction data, reconciliation, retry limits, policy violations, and AI decision validation.

### X. Honest Demonstration
The final Buildathon demonstration MUST showcase real functionality implemented in the repository.
Do NOT use fake screenshots, fabricated metrics, simulated capabilities presented as real integrations, or false capability claims. Synthetic scenarios are acceptable ONLY when explicitly labeled as such.

### XI. Build for the 5-Minute Pitch
Architecture and implementation decisions MUST directly support a clear 5-minute pitch sequence:
1. Revenue-recovery situation
2. AI investigation/decision
3. Policy-controlled action
4. Meaningful failure or unsafe condition
5. Safe stopping / escalation
6. Recovery / reconciliation
7. Measurable outcome
Presentation requirements MUST NEVER justify unsafe code shortcuts.

### XII. Simplicity Over Unnecessary Complexity
Prefer the simplest architecture that correctly satisfies the core requirements.
Do NOT introduce unnecessary microservices, multi-agent frameworks, complex background infrastructure, or bloated dependencies. A small, reliable system MUST always take precedence over a large, fragile system.

---

## Technical Direction & Scope Constraints

### Approved Technology Preferences
* **Frontend**: Next.js, React, TypeScript, Tailwind CSS
* **Backend / Database**: Supabase / PostgreSQL
* **Payment Integration**: Razorpay APIs & Webhooks
* **AI Layer**: LLM integration for decision synthesis & investigation
* **Control Layer**: Deterministic TypeScript/Python Policy Engine

*Note: Dependencies must be kept minimal. Final technical selections will be formalized during `/speckit.plan`.*

### Explicit Scope Exclusions (Not Core Requirements)
* Generic AI payment chatbot
* Large merchant analytics platform
* What-if scenario simulator
* Fake predictive AI confidence scores
* Multi-agent framework overhead
* Unrelated AI merchant autopilot features

---

## Governance

1. **Supremacy**: This Constitution supersedes all other project design docs, code comments, and implementation choices.
2. **Amendments**: Any change to these principles requires an explicit version bump, justification in the Sync Impact Report, and update to dependent templates.
3. **Compliance Review**: All feature specifications (`spec.md`), implementation plans (`plan.md`), and pull requests MUST include a Constitution Check against these 12 principles.
4. **Versioning Policy**:
   - **MAJOR**: Removal or incompatible redefinition of a core safety principle.
   - **MINOR**: Addition of new principles or expanded technical direction.
   - **PATCH**: Clarifications, wording improvements, or typo fixes.

**Version**: 1.0.0 | **Ratified**: 2026-08-25 | **Last Amended**: 2026-08-25
