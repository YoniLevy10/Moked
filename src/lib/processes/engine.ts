import {
  addBusinessEvents,
  addMessage,
  getOrCreateConversation,
  listPhoneNumbers,
  updateConversation,
  updateTenant,
} from "@/lib/store/db";
import { outboundPeriod } from "@/lib/product/bot";
import { currentPeriod, toE164Il } from "@/lib/product/model";
import { sendWhatsAppText } from "@/lib/whatsapp/client";
import { Conversation, ProcessKey, Tenant } from "@/lib/types";
import { handleIntake } from "@/lib/processes/waves/intake";
import { handleQualification } from "@/lib/processes/waves/qualification";
import { handleBooking } from "@/lib/processes/waves/booking";
import {
  handleReminderReply,
  buildReminderMessages,
} from "@/lib/processes/waves/reminders";
import { handleRetention } from "@/lib/processes/waves/retention";
import { handleQuote } from "@/lib/processes/waves/quote";
import { handlePayment } from "@/lib/processes/waves/payment";
import { ProcessResult } from "@/lib/processes/types";
import { resolveChannel } from "@/lib/channels";
import { MessagingChannel } from "@/lib/channels/types";
import { runAgentTurn } from "@/lib/agent";
import { notifyOwnerFromAgent } from "@/lib/agent/notify";
import {
  blockingFailures,
  evaluateReadiness,
} from "@/lib/product/readiness";

function enabled(tenant: Tenant, key: ProcessKey): boolean {
  return Boolean(tenant.processes[key]?.enabled);
}

function runActiveProcess(
  tenant: Tenant,
  conversation: Conversation,
  inboundText: string,
): ProcessResult {
  const ctx = { tenant, conversation, inboundText };

  // Explicit intent keywords win over a stuck active process
  if (/הצעה|מחיר|כמה עולה/i.test(inboundText) && enabled(tenant, "quote")) {
    return handleQuote({
      ...ctx,
      conversation: {
        ...conversation,
        activeProcess: "quote",
        quote: { status: "draft" },
      },
    });
  }
  if (/לשלם|תשלום|גבייה/i.test(inboundText) && enabled(tenant, "payment")) {
    return handlePayment({
      ...ctx,
      conversation: { ...conversation, activeProcess: "payment" },
    });
  }
  if (/ביקורת|הפניה/i.test(inboundText) && enabled(tenant, "retention")) {
    return handleRetention(ctx);
  }

  const active = conversation.activeProcess;

  if (active === "qualification" && enabled(tenant, "qualification")) {
    const result = handleQualification(ctx);
    if (
      result.conversationPatch?.processState &&
      (result.conversationPatch.processState as { handoffToBooking?: boolean })
        .handoffToBooking &&
      enabled(tenant, "booking")
    ) {
      const mid: Conversation = {
        ...conversation,
        ...result.conversationPatch,
        processState: {
          ...conversation.processState,
          ...result.conversationPatch.processState,
        },
        booking: result.conversationPatch.booking ?? conversation.booking,
      };
      const booking = handleBooking({
        tenant,
        conversation: mid,
        inboundText: "",
      });
      return {
        handled: true,
        replies: [...result.replies, ...booking.replies],
        conversationPatch: {
          ...result.conversationPatch,
          ...booking.conversationPatch,
          processState: {
            ...result.conversationPatch.processState,
            ...booking.conversationPatch?.processState,
          },
        },
        events: [...(result.events ?? []), ...(booking.events ?? [])],
      };
    }
    return result;
  }
  if (active === "booking" && enabled(tenant, "booking")) {
    return handleBooking(ctx);
  }
  if (active === "reminders" && enabled(tenant, "reminders")) {
    return handleReminderReply(ctx);
  }
  if (active === "retention" && enabled(tenant, "retention")) {
    return handleRetention(ctx);
  }
  if (active === "quote" && enabled(tenant, "quote")) {
    const result = handleQuote(ctx);
    if (
      result.conversationPatch?.processState &&
      (result.conversationPatch.processState as { handoffToPayment?: boolean })
        .handoffToPayment &&
      enabled(tenant, "payment")
    ) {
      const mid: Conversation = {
        ...conversation,
        ...result.conversationPatch,
        processState: {
          ...conversation.processState,
          ...result.conversationPatch.processState,
        },
        quote: {
          ...conversation.quote,
          ...result.conversationPatch.quote,
        },
      };
      const payment = handlePayment({
        tenant,
        conversation: mid,
        inboundText: "",
      });
      return {
        handled: true,
        replies: [...result.replies, ...payment.replies],
        conversationPatch: {
          ...result.conversationPatch,
          ...payment.conversationPatch,
          processState: {
            ...result.conversationPatch.processState,
            ...payment.conversationPatch?.processState,
          },
        },
        events: [...(result.events ?? []), ...(payment.events ?? [])],
      };
    }
    return result;
  }
  if (active === "payment" && enabled(tenant, "payment")) {
    return handlePayment(ctx);
  }

  if (enabled(tenant, "reminders") && conversation.booking?.confirmedAt) {
    const reminder = handleReminderReply({
      tenant,
      conversation,
      inboundText,
    });
    if (reminder.handled) return reminder;
  }

  if (enabled(tenant, "intake") && !conversation.processState?.intakeDone) {
    return handleIntake(ctx);
  }

  if (
    enabled(tenant, "qualification") &&
    conversation.processState?.intakeDone &&
    !conversation.processState?.qualificationDone
  ) {
    return handleQualification(ctx);
  }

  if (/תור|לקבוע|פגישה/i.test(inboundText) && enabled(tenant, "booking")) {
    return handleBooking({
      ...ctx,
      conversation: {
        ...conversation,
        booking: undefined,
        activeProcess: "booking",
      },
    });
  }

  return {
    handled: true,
    replies: [
      {
        body: "קיבלתי, תודה. בעל העסק יחזור אליך בהקדם — או כתוב/י \"תור\" / \"הצעה\" / \"תשלום\".",
        processKey: "intake",
      },
    ],
  };
}

function eventPayloadFor(
  eventType: string,
  conversation: Conversation,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (conversation.leadScore != null) payload.leadScore = conversation.leadScore;
  if (conversation.intent) payload.intent = conversation.intent;
  if (
    eventType === "quote.accepted" ||
    eventType === "quote.sent" ||
    eventType === "payment.paid" ||
    eventType === "payment.link_sent"
  ) {
    if (conversation.quote?.amountIls != null) {
      payload.amountIls = conversation.quote.amountIls;
    }
  }
  if (eventType === "booking.confirmed" && conversation.booking?.confirmedAt) {
    payload.confirmedAt = conversation.booking.confirmedAt;
  }
  return payload;
}

async function persistEvents(
  tenant: Tenant,
  conversation: Conversation,
  eventTypes: string[] | undefined,
  channel: MessagingChannel,
) {
  if (!eventTypes?.length) return;
  await addBusinessEvents(
    eventTypes.map((eventType) => ({
      tenantId: tenant.id,
      conversationId: conversation.id,
      eventType,
      payload: eventPayloadFor(eventType, conversation),
      channel: channel.kind,
    })),
  );
}

async function deliverReplies(input: {
  tenant: Tenant;
  to: string;
  conversation: Conversation;
  replies: ProcessResult["replies"];
  channel: MessagingChannel;
}) {
  for (const reply of input.replies) {
    await input.channel.sendText({
      tenant: input.tenant,
      to: input.to,
      body: reply.body,
      type: reply.type,
    });
    await addMessage({
      conversationId: input.conversation.id,
      tenantId: input.tenant.id,
      direction: "outbound",
      body: reply.body,
      type: reply.type ?? "text",
      processKey: reply.processKey,
    });
  }
}

export async function handleInboundMessage(input: {
  tenant: Tenant;
  /** External customer id on the active channel (WhatsApp phone today). */
  customerWaId: string;
  customerName?: string;
  text: string;
  metaMessageId?: string;
}): Promise<{
  conversation: Conversation;
  result: ProcessResult;
}> {
  if (input.tenant.whatsapp.connected !== true) {
    throw new Error("Channel not connected");
  }

  const channel = resolveChannel(input.tenant);

  let conversation = await getOrCreateConversation({
    tenantId: input.tenant.id,
    customerWaId: input.customerWaId,
    customerName: input.customerName,
  });

  await addMessage({
    conversationId: conversation.id,
    tenantId: input.tenant.id,
    direction: "inbound",
    body: input.text,
    type: "text",
    metaMessageId: input.metaMessageId,
  });

  if (conversation.status === "human_takeover") {
    const result: ProcessResult = {
      handled: true,
      replies: [],
      events: ["human.takeover.active"],
    };
    await persistEvents(input.tenant, conversation, result.events, channel);
    return { conversation, result };
  }

  const silenced =
    input.tenant.subscription.status === "canceled" ||
    input.tenant.subscription.status === "past_due";
  if (silenced) {
    const result: ProcessResult = {
      handled: true,
      replies: [],
      events: ["subscription.inactive"],
    };
    await persistEvents(input.tenant, conversation, result.events, channel);
    return { conversation, result };
  }

  const readiness = await evaluateReadiness(input.tenant.id);
  const blocked = blockingFailures(readiness);
  if (blocked.length > 0) {
    const result: ProcessResult = {
      handled: true,
      replies: [],
      events: ["tenant.blocked"],
    };
    await persistEvents(input.tenant, conversation, result.events, channel);
    return { conversation, result };
  }

  const numbers = await listPhoneNumbers();
  const liveNumber = numbers.find(
    (phone) => phone.tenantId === input.tenant.id && phone.status === "live",
  );
  const metered = Boolean(liveNumber);
  let result: ProcessResult;
  if (metered && outboundPeriod(input.tenant).blocked) {
    result = { handled: true, replies: [], events: ["bot.cap_reached"] };
  } else {
    const agent = await runAgentTurn({
      tenant: input.tenant,
      conversation,
      inboundText: input.text,
    });
    if (agent.handled) {
      result = {
        handled: true,
        replies: agent.replies,
        conversationPatch: agent.conversationPatch,
        events: agent.events,
      };
      if (agent.decision.nextAction === "escalate") {
        await notifyOwnerFromAgent({
          tenant: input.tenant,
          conversation,
          reason: agent.decision.intent,
          inboundText: input.text,
        });
      }
    } else {
      // Agent routed a process or passed through — keep deterministic engine ownership
      const routed = agent.decision.processKey
        ? {
            ...conversation,
            ...(agent.conversationPatch ?? {}),
            activeProcess:
              agent.decision.processKey ?? conversation.activeProcess,
          }
        : { ...conversation, ...(agent.conversationPatch ?? {}) };
      result = runActiveProcess(input.tenant, routed, input.text);
      if (agent.conversationPatch?.agent && result.conversationPatch) {
        result = {
          ...result,
          conversationPatch: {
            ...result.conversationPatch,
            agent: {
              ...(routed.agent ?? {}),
              ...(agent.conversationPatch.agent ?? {}),
              ...(result.conversationPatch.agent ?? {}),
            },
          },
        };
      } else if (agent.conversationPatch && !result.conversationPatch) {
        result = {
          ...result,
          conversationPatch: agent.conversationPatch,
        };
      }
    }
  }

  if (result.conversationPatch) {
    conversation = await updateConversation(
      conversation.id,
      result.conversationPatch,
    );
  }

  await deliverReplies({
    tenant: input.tenant,
    to: input.customerWaId,
    conversation,
    replies: result.replies,
    channel,
  });

  if (metered && result.replies.length > 0) {
    const period = currentPeriod();
    const count =
      (input.tenant.subscription.outboundPeriod === period
        ? input.tenant.subscription.outboundCount
        : 0) + result.replies.length;
    await updateTenant(input.tenant.id, {
      subscription: {
        ...input.tenant.subscription,
        outboundPeriod: period,
        outboundCount: count,
      },
    });
  }

  await persistEvents(input.tenant, conversation, result.events, channel);

  if (result.events?.includes("lead.created")) {
    const notified = await notifyOwner({
      tenant: input.tenant,
      customerWaId: input.customerWaId,
      customerName: input.customerName,
      text: input.text,
    });
    if (notified) {
      await persistEvents(input.tenant, conversation, ["owner.notified"], channel);
    }
  }

  return { conversation, result };
}

async function notifyOwner(input: {
  tenant: Tenant;
  customerWaId: string;
  customerName?: string;
  text: string;
}) {
  const to = toE164Il(input.tenant.phone);
  if (!to) return false;
  const who = input.customerName || input.customerWaId;
  await sendWhatsAppText({
    tenant: input.tenant,
    to,
    body: `ליד חדש ב־${input.tenant.businessName}: ${who}\n${input.text.slice(0, 160)}`,
  });
  return true;
}

export async function triggerReminder(input: {
  tenant: Tenant;
  conversation: Conversation;
  kind: "t24" | "t2";
}) {
  if (!enabled(input.tenant, "reminders")) {
    return { skipped: true as const };
  }
  const channel = resolveChannel(input.tenant);
  const result = buildReminderMessages(
    input.tenant,
    input.conversation,
    input.kind,
  );
  let conversation = input.conversation;
  if (result.conversationPatch) {
    conversation = await updateConversation(
      input.conversation.id,
      result.conversationPatch,
    );
  }
  await deliverReplies({
    tenant: input.tenant,
    to: input.conversation.customerWaId,
    conversation,
    replies: result.replies,
    channel,
  });
  await persistEvents(input.tenant, conversation, result.events, channel);
  return { skipped: false as const, result };
}

export async function triggerRetention(input: {
  tenant: Tenant;
  conversation: Conversation;
}) {
  if (!enabled(input.tenant, "retention")) return { skipped: true as const };
  const channel = resolveChannel(input.tenant);
  const result = handleRetention({
    tenant: input.tenant,
    conversation: input.conversation,
    inboundText: "",
  });
  let conversation = input.conversation;
  if (result.conversationPatch) {
    conversation = await updateConversation(
      input.conversation.id,
      result.conversationPatch,
    );
  }
  await deliverReplies({
    tenant: input.tenant,
    to: input.conversation.customerWaId,
    conversation,
    replies: result.replies,
    channel,
  });
  await persistEvents(input.tenant, conversation, result.events, channel);
  return { skipped: false as const, result };
}
