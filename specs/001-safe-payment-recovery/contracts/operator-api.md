# Operator UI & REST API Contract

## 1. Case List Endpoint

**Endpoint**: `GET /api/cases`  
**Query Parameters**:
- `status` (optional): `DETECTED`, `RECOVERY_INITIATED`, `RECOVERED`, `ESCALATED`, etc.
- `safety_state` (optional): `ACTIVE`, `PAUSED`, `BLOCKED`, `AWAITING_RECONCILIATION`, `ESCALATED`

**Response (200 OK)**:
```json
{
  "cases": [
    {
      "id": "uuid-1",
      "razorpay_payment_id": "pay_Lxyz1234567890",
      "amount": 500.00,
      "currency": "INR",
      "current_status": "ESCALATED",
      "safety_state": "ESCALATED",
      "integrity_state": "CONTRADICTORY",
      "retry_count": 0,
      "created_at": "2026-08-25T23:00:00Z"
    }
  ]
}
```

---

## 2. Case Details & Audit Log Endpoint

**Endpoint**: `GET /api/cases/{id}`  

**Response (200 OK)**:
```json
{
  "case": {
    "id": "uuid-1",
    "razorpay_payment_id": "pay_Lxyz1234567890",
    "amount": 500.00,
    "currency": "INR",
    "current_status": "ESCALATED",
    "safety_state": "ESCALATED",
    "integrity_state": "CONTRADICTORY",
    "retry_count": 0,
    "created_at": "2026-08-25T23:00:00Z"
  },
  "events": [
    {
      "event_id": "event_1",
      "event_type": "payment.failed",
      "integrity_state": "TRUSTED",
      "timestamp": "2026-08-25T23:00:00Z"
    },
    {
      "event_id": "event_2",
      "event_type": "payment.captured",
      "integrity_state": "CONTRADICTORY",
      "timestamp": "2026-08-25T22:59:00Z"
    }
  ],
  "investigation": {
    "proposed_decision": "ESCALATE",
    "reasoning": "Conflicting failure and capture events detected.",
    "risk_factors": ["OUT_OF_ORDER_TIMESTAMPS"]
  },
  "policy_check": {
    "status": "ESCALATED",
    "violated_rules": ["INTEGRITY_CHECK_FAILED"],
    "deterministic_reason": "Policy rule INTEGRITY_CHECK_FAILED violated: Integrity state CONTRADICTORY is not permitted for recovery."
  },
  "audit_trail": [
    {
      "step_number": 1,
      "step_name": "Detect",
      "actor": "SYSTEM",
      "payload": { "event_id": "event_1" }
    },
    {
      "step_number": 2,
      "step_name": "Investigate",
      "actor": "LLM",
      "payload": { "decision": "ESCALATE" }
    },
    {
      "step_number": 3,
      "step_name": "Policy Check",
      "actor": "POLICY_ENGINE",
      "payload": { "status": "ESCALATED" }
    }
  ]
}
```

---

## 3. Manual Reconciliation Endpoint

**Endpoint**: `POST /api/cases/{id}/reconcile`  

**Response (200 OK)**:
```json
{
  "status": "reconciled",
  "previous_integrity_state": "INCOMPLETE",
  "new_integrity_state": "TRUSTED",
  "razorpay_payment_status": "failed",
  "next_action": "POLICY_REEVALUATE"
}
```

**Response (Reconciliation Failure / API Error)**:
```json
{
  "status": "reconciliation_failed",
  "error": "RAZORPAY_API_TIMEOUT",
  "retry_count": 1,
  "case_safety_state": "AWAITING_RECONCILIATION",
  "message": "Transaction history preserved. Case remains safely paused."
}
```
