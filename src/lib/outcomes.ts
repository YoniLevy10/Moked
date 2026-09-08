import { z } from "zod";

/**
 * First-class business outcome events.
 * Dashboard metrics derive from these — never from raw message counts.
 */
export const BusinessEventTypeSchema = z.enum([
  "lead.created",
  "lead.qualification_started",
  "lead.qualified",
  "lead.hot",
  "lead.warm_or_cold",
  "intake.completed",
  "intake.spam_filtered",
  "intake.support_escalated",
  "booking.proposed",
  "booking.slot_chosen",
  "booking.confirmed",
  "booking.rescheduled",
  "booking.cancelled_by_customer",
  "reminder.sent",
  "attendance.confirmed",
  "reminder.reschedule_requested",
  "quote.sent",
  "quote.accepted",
  "quote.rejected",
  "quote.discount_requested",
  "quote.blocked_no_pricing",
  "payment.link_sent",
  "payment.paid",
  "payment.failed",
  "payment.blocked_no_provider",
  "review.requested",
  "referral.requested",
  "referral.accepted",
  "referral.declined",
  "wave_a.completed",
  "human.takeover.active",
  "human.decision_needed",
  "message.sent",
]);

export type BusinessEventType = z.infer<typeof BusinessEventTypeSchema>;

export const BusinessEventSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  conversationId: z.string().optional(),
  eventType: z.string(),
  payload: z.record(z.string(), z.unknown()).default({}),
  channel: z.string().default("whatsapp"),
  createdAt: z.string(),
});

export type BusinessEvent = z.infer<typeof BusinessEventSchema>;

/** Outcome KPIs for the owner dashboard (differentiation surface). */
export type OutcomeMetrics = {
  leadsCreated: number;
  leadsQualified: number;
  leadsHot: number;
  appointmentsBooked: number;
  quotesAccepted: number;
  revenueIls: number;
  paymentsCollected: number;
  customersReturned: number;
  reviewsRequested: number;
  referralsAccepted: number;
};

export function emptyOutcomeMetrics(): OutcomeMetrics {
  return {
    leadsCreated: 0,
    leadsQualified: 0,
    leadsHot: 0,
    appointmentsBooked: 0,
    quotesAccepted: 0,
    revenueIls: 0,
    paymentsCollected: 0,
    customersReturned: 0,
    reviewsRequested: 0,
    referralsAccepted: 0,
  };
}

export function aggregateOutcomes(
  events: Array<Pick<BusinessEvent, "eventType" | "payload">>,
): OutcomeMetrics {
  const m = emptyOutcomeMetrics();
  for (const e of events) {
    switch (e.eventType) {
      case "lead.created":
        m.leadsCreated += 1;
        break;
      case "lead.qualified":
        m.leadsQualified += 1;
        break;
      case "lead.hot":
        m.leadsHot += 1;
        break;
      case "booking.confirmed":
        m.appointmentsBooked += 1;
        break;
      case "quote.accepted":
        m.quotesAccepted += 1;
        break;
      case "payment.paid": {
        m.paymentsCollected += 1;
        const amount = Number(e.payload?.amountIls ?? 0);
        if (Number.isFinite(amount) && amount > 0) m.revenueIls += amount;
        break;
      }
      case "referral.accepted":
        m.customersReturned += 1;
        m.referralsAccepted += 1;
        break;
      case "review.requested":
        m.reviewsRequested += 1;
        break;
      default:
        break;
    }
  }
  return m;
}
