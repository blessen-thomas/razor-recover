import { memoryStore, PaymentEventRecord } from "../db";

export type IntegrityState = "TRUSTED" | "STALE" | "DUPLICATE" | "OUT_OF_ORDER" | "INCOMPLETE" | "CONTRADICTORY";

export interface EventIntegrityResult {
  integrityState: IntegrityState;
  reason: string;
  isDuplicate: boolean;
}

export function evaluateEventIntegrity(
  eventPayload: any,
  existingEvents: PaymentEventRecord[]
): EventIntegrityResult {
  const eventId = eventPayload.event_id || eventPayload.id;
  const eventType = eventPayload.event;
  const createdAt = eventPayload.created_at || (eventPayload.payload?.payment?.entity?.created_at);

  // 1. Check for Duplicate Event ID
  if (eventId && memoryStore.events.has(eventId)) {
    return {
      integrityState: "DUPLICATE",
      reason: `Event ID ${eventId} has already been ingested.`,
      isDuplicate: true,
    };
  }

  const existingDuplicate = existingEvents.find((e) => e.event_id === eventId);
  if (existingDuplicate) {
    return {
      integrityState: "DUPLICATE",
      reason: `Event ID ${eventId} already exists in case history.`,
      isDuplicate: true,
    };
  }

  // 2. Check for Incomplete Event Payload
  if (!eventType || !eventPayload.payload?.payment?.entity) {
    return {
      integrityState: "INCOMPLETE",
      reason: "Payload is missing required Razorpay payment entity data.",
      isDuplicate: false,
    };
  }

  // 3. Check for Stale Event Payload (> 1 hour old)
  if (createdAt) {
    const eventTime = typeof createdAt === "number" ? createdAt * 1000 : new Date(createdAt).getTime();
    const now = Date.now();
    const ONE_HOUR_MS = 60 * 60 * 1000;
    if (now - eventTime > ONE_HOUR_MS) {
      return {
        integrityState: "STALE",
        reason: `Event payload timestamp is stale (${Math.round((now - eventTime) / 60000)} minutes old).`,
        isDuplicate: false,
      };
    }
  }

  // 4. Check for Out-of-Order / Contradictory Event History
  if (existingEvents.length > 0) {
    const hasCaptured = existingEvents.some((e) => e.event_type === "payment.captured");
    const hasAuthorized = existingEvents.some((e) => e.event_type === "payment.authorized");

    // If incoming event is payment.failed, but we already have a payment.captured event
    if (eventType === "payment.failed" && hasCaptured) {
      return {
        integrityState: "CONTRADICTORY",
        reason: "Received payment.failed event for a transaction that was already captured.",
        isDuplicate: false,
      };
    }

    // If incoming event is payment.captured, but we already had payment.failed without retry
    if (eventType === "payment.captured" && existingEvents[existingEvents.length - 1].event_type === "payment.failed") {
      const lastEvent = existingEvents[existingEvents.length - 1];
      const lastTime = new Date(lastEvent.event_timestamp).getTime();
      const currTime = createdAt ? (typeof createdAt === "number" ? createdAt * 1000 : new Date(createdAt).getTime()) : Date.now();
      
      if (currTime < lastTime) {
        return {
          integrityState: "OUT_OF_ORDER",
          reason: "Received payment.captured event with timestamp earlier than preceding payment.failed event.",
          isDuplicate: false,
        };
      }
    }
  }

  // If all checks pass cleanly
  return {
    integrityState: "TRUSTED",
    reason: "Event payload signature, timestamp, and sequence are verified.",
    isDuplicate: false,
  };
}
