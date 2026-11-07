import { Conversation, Tenant } from "@/lib/types";
import { updateConversation } from "@/lib/store/db";
import { toE164Il } from "@/lib/product/model";
import { sendWhatsAppText } from "@/lib/whatsapp/client";

export type EscalationReason =
  | "human.decision_needed"
  | "low_confidence"
  | "person_requested"
  | "payment_exception"
  | "quote_exception"
  | "support_escalated";

const MAX_ATTEMPTS = 2;
const RENOTIFY_MS = 30 * 60 * 1000;

export function escalationReasonFrom(input: {
  events?: string[];
  inboundText: string;
  conversation: Conversation;
}): EscalationReason | null {
  const events = input.events ?? [];
  if (events.includes("payment.failed")) return "payment_exception";
  if (
    events.includes("quote.discount_requested") ||
    events.includes("human.decision_needed")
  ) {
    return "quote_exception";
  }
  if (events.includes("intake.support_escalated")) return "support_escalated";
  if (/אדם|נציג|אנושי|human|person|מנהל/i.test(input.inboundText)) {
    return "person_requested";
  }
  if (
    typeof input.conversation.leadScore === "number" &&
    input.conversation.leadScore > 0 &&
    input.conversation.leadScore < 35
  ) {
    return "low_confidence";
  }
  if (events.includes("human.decision_needed")) return "human.decision_needed";
  return null;
}

/** Respect tenant.bot.answers.hours except for payment issues (immediate). */
export function withinOwnerHours(
  tenant: Tenant,
  reason: EscalationReason,
  now = new Date(),
): boolean {
  if (reason === "payment_exception") return true;
  const hours = tenant.bot.answers.hours?.trim() ?? "";
  if (!hours) return true;
  // Free-text hours: if mentions "סגור" / closed keywords for current hour — skip.
  // Default open 8–20 local (Asia/Jerusalem) when a hours string exists.
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jerusalem",
      hour: "numeric",
      hour12: false,
    }).format(now),
  );
  return hour >= 8 && hour < 20;
}

async function deliverOwnerNotice(input: {
  tenant: Tenant;
  conversation: Conversation;
  reason: EscalationReason;
}): Promise<"whatsapp" | "email" | "log"> {
  const to = toE164Il(input.tenant.phone);
  const who =
    input.conversation.customerName || input.conversation.customerWaId;
  const body = `ממתין לאדם · ${input.tenant.businessName}\nסיבה: ${input.reason}\nלקוח: ${who}`;
  if (to) {
    await sendWhatsAppText({
      tenant: input.tenant,
      to,
      body,
    });
    return "whatsapp";
  }
  console.info("[moked:escalation:email-stub]", body);
  return "email";
}

/**
 * Escalate once per conversation. Returns updated conversation or null if skipped.
 */
export async function escalateConversation(input: {
  tenant: Tenant;
  conversation: Conversation;
  reason: EscalationReason;
  now?: Date;
}): Promise<Conversation | null> {
  const existing = input.conversation.escalation;
  if (existing && !existing.resolvedAt) return null;

  const now = input.now ?? new Date();
  if (!withinOwnerHours(input.tenant, input.reason, now)) {
    const queued = await updateConversation(input.conversation.id, {
      escalation: {
        reason: input.reason,
        at: now.toISOString(),
        attempts: 0,
      },
    });
    return queued;
  }

  const channel = await deliverOwnerNotice({
    tenant: input.tenant,
    conversation: input.conversation,
    reason: input.reason,
  });

  return updateConversation(input.conversation.id, {
    escalation: {
      reason: input.reason,
      at: now.toISOString(),
      notifiedAt: now.toISOString(),
      channel,
      attempts: 1,
    },
  });
}

/** Re-notify once after 30m if unresolved; hard cap 2 attempts. */
export async function maybeRenotifyEscalation(input: {
  tenant: Tenant;
  conversation: Conversation;
  now?: Date;
}): Promise<Conversation | null> {
  const esc = input.conversation.escalation;
  if (!esc || esc.resolvedAt) return null;
  if ((esc.attempts ?? 0) >= MAX_ATTEMPTS) return null;
  const now = input.now ?? new Date();
  const anchor = new Date(esc.notifiedAt ?? esc.at).getTime();
  if (Number.isNaN(anchor) || now.getTime() - anchor < RENOTIFY_MS) return null;
  if (!withinOwnerHours(input.tenant, esc.reason as EscalationReason, now)) {
    return null;
  }

  const channel = await deliverOwnerNotice({
    tenant: input.tenant,
    conversation: input.conversation,
    reason: esc.reason as EscalationReason,
  });

  return updateConversation(input.conversation.id, {
    escalation: {
      ...esc,
      notifiedAt: now.toISOString(),
      channel,
      attempts: (esc.attempts ?? 0) + 1,
    },
  });
}

export async function takeoverConversation(
  conversationId: string,
): Promise<Conversation> {
  const updated = await updateConversation(conversationId, {
    status: "human_takeover",
  });
  return updated;
}

export async function resolveEscalation(
  conversationId: string,
  conversation: Conversation,
): Promise<Conversation> {
  const esc = conversation.escalation;
  return updateConversation(conversationId, {
    status: "open",
    escalation: esc
      ? {
          ...esc,
          resolvedAt: new Date().toISOString(),
        }
      : {
          reason: "resolved",
          at: new Date().toISOString(),
          resolvedAt: new Date().toISOString(),
          attempts: 0,
        },
  });
}

export function waitingForHuman(conversations: Conversation[]): Conversation[] {
  return conversations
    .filter((c) => c.escalation && !c.escalation.resolvedAt)
    .sort((a, b) => {
      const aAt = new Date(a.escalation!.at).getTime();
      const bAt = new Date(b.escalation!.at).getTime();
      return aAt - bAt;
    });
}
