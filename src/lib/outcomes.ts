import { z } from "zod";

/**
 * First-class business outcome events.
 * Dashboard metrics derive from these — never from raw message counts.
 */
export const BusinessEventTypeSchema = z.enum([
  "lead.created",
  "owner.notified",
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
  "agent.grounded_reply",
  "agent.clarify",
  "agent.opt_out",
  "tenant.blocked",
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
  /** Beachhead four-number screen */
  inquiriesReceived: number;
  answeredUnder1Min: number;
  visitsScheduled: number;
  bookedValueIls: number;
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
    inquiriesReceived: 0,
    answeredUnder1Min: 0,
    visitsScheduled: 0,
    bookedValueIls: 0,
  };
}

export function aggregateOutcomes(
  events: Array<
    Pick<BusinessEvent, "eventType" | "payload" | "conversationId"> & {
      createdAt?: string;
    }
  >,
): OutcomeMetrics {
  const m = emptyOutcomeMetrics();
  const leadAt = new Map<string, number>();
  for (const e of events) {
    const convId =
      e.conversationId ??
      (typeof e.payload?.conversationId === "string"
        ? e.payload.conversationId
        : undefined);
    switch (e.eventType) {
      case "lead.created":
        m.leadsCreated += 1;
        m.inquiriesReceived += 1;
        if (convId && e.createdAt) {
          leadAt.set(convId, Date.parse(e.createdAt));
        }
        break;
      case "lead.qualified":
        m.leadsQualified += 1;
        countAnsweredUnder1Min(m, leadAt, convId, e.createdAt);
        break;
      case "lead.hot":
        m.leadsHot += 1;
        break;
      case "booking.confirmed":
        m.appointmentsBooked += 1;
        m.visitsScheduled += 1;
        break;
      case "quote.accepted": {
        m.quotesAccepted += 1;
        const amount = Number(e.payload?.amountIls ?? 0);
        if (Number.isFinite(amount) && amount > 0) m.bookedValueIls += amount;
        break;
      }
      case "agent.grounded_reply":
      case "agent.clarify":
      case "message.sent":
      case "intake.completed":
      case "booking.proposed": {
        countAnsweredUnder1Min(m, leadAt, convId, e.createdAt);
        break;
      }
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

/** The four beachhead numbers — one screen for trades owners. */
export type FourNumbers = {
  inquiriesReceived: number;
  answeredUnder1Min: number;
  visitsScheduled: number;
  bookedValueIls: number;
};

export function fourNumbersFromOutcomes(m: OutcomeMetrics): FourNumbers {
  return {
    inquiriesReceived: m.inquiriesReceived,
    answeredUnder1Min: m.answeredUnder1Min,
    visitsScheduled: m.visitsScheduled,
    bookedValueIls: m.bookedValueIls,
  };
}

/**
 * Demo tenants must never look live on a sales call.
 * Badge when WhatsApp channel mode is demo (not Meta live).
 */
export function tenantShowsDemoDataBadge(tenant: {
  whatsapp?: { mode?: string };
}): boolean {
  return (tenant.whatsapp?.mode ?? "demo") === "demo";
}

function countAnsweredUnder1Min(
  m: OutcomeMetrics,
  leadAt: Map<string, number>,
  convId: string | undefined,
  createdAt: string | undefined,
) {
  if (!convId || !leadAt.has(convId)) return;
  const start = leadAt.get(convId)!;
  const at = createdAt ? Date.parse(createdAt) : NaN;
  const lag = at - start;
  if (Number.isFinite(lag) && lag >= 0 && lag <= 60_000) {
    m.answeredUnder1Min += 1;
    leadAt.delete(convId);
  } else if (!Number.isFinite(lag)) {
    // Missing timestamps: do not invent a sub-minute win from incomplete records.
  } else {
    leadAt.delete(convId);
  }
}
