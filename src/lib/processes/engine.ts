import {
  addMessage,
  getOrCreateConversation,
  updateConversation,
} from "@/lib/store/db";
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
import { ProcessContext, ProcessResult } from "@/lib/processes/types";
import {
  isLiveWhatsApp,
  sendOutboundAction,
  sendTypingIndicator,
} from "@/lib/whatsapp/client";
import { isOutboundBlockedByQuality } from "@/lib/whatsapp/quality";
import { sendCtwaConversion } from "@/lib/whatsapp/ctwa";

function enabled(tenant: Tenant, key: ProcessKey): boolean {
  return Boolean(tenant.processes[key]?.enabled);
}

function runActiveProcess(ctx: ProcessContext): ProcessResult {
  const { tenant, conversation, inboundText } = ctx;

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
        ...ctx,
        conversation: mid,
        inboundText: "",
        interactiveId: undefined,
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
        ...ctx,
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
    const reminder = handleReminderReply(ctx);
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

async function dispatchReplies(input: {
  tenant: Tenant;
  to: string;
  conversationId: string;
  replies: ProcessResult["replies"];
}) {
  const blocked =
    isLiveWhatsApp(input.tenant) && isOutboundBlockedByQuality(input.tenant);

  for (const reply of input.replies) {
    const isProactiveTemplate = reply.type === "template";
    if (blocked && isProactiveTemplate) {
      await addMessage({
        conversationId: input.conversationId,
        tenantId: input.tenant.id,
        direction: "outbound",
        body: `[נחסם — quality RED] ${reply.body}`,
        type: "system",
        processKey: reply.processKey,
        deliveryStatus: "failed",
      });
      continue;
    }

    // Live templates may fail if not approved — fall back to text/interactive body.
    let send = await sendOutboundAction({
      tenant: input.tenant,
      to: input.to,
      reply,
    });
    if (!send.ok && reply.type === "template") {
      send = await sendOutboundAction({
        tenant: input.tenant,
        to: input.to,
        reply: { ...reply, type: "text", template: undefined },
      });
    }

    await addMessage({
      conversationId: input.conversationId,
      tenantId: input.tenant.id,
      direction: "outbound",
      body: reply.body,
      type: reply.type ?? "text",
      processKey: reply.processKey,
      metaMessageId: send.id,
      deliveryStatus: send.ok ? (send.demo ? "sent" : "pending") : "failed",
      interactivePayload: reply.interactive
        ? (reply.interactive as unknown as Record<string, unknown>)
        : undefined,
    });
  }
}

export async function handleInboundMessage(input: {
  tenant: Tenant;
  customerWaId: string;
  customerName?: string;
  text: string;
  metaMessageId?: string;
  interactiveId?: string;
  locationAddress?: string;
  flowResponseJson?: string;
  referral?: Conversation["referral"];
  mediaId?: string;
  mediaMime?: string;
}): Promise<{
  conversation: Conversation;
  result: ProcessResult;
}> {
  if (input.tenant.whatsapp.connected !== true) {
    throw new Error("WhatsApp not connected");
  }

  let conversation = await getOrCreateConversation({
    tenantId: input.tenant.id,
    customerWaId: input.customerWaId,
    customerName: input.customerName,
  });

  if (input.metaMessageId) {
    void sendTypingIndicator({
      tenant: input.tenant,
      messageId: input.metaMessageId,
    }).catch(() => undefined);
  }

  await addMessage({
    conversationId: conversation.id,
    tenantId: input.tenant.id,
    direction: "inbound",
    body: input.text,
    type: input.interactiveId ? "interactive" : "text",
    metaMessageId: input.metaMessageId,
    mediaMime: input.mediaMime,
    interactivePayload: input.interactiveId
      ? { id: input.interactiveId }
      : undefined,
  });

  if (conversation.status === "human_takeover") {
    return {
      conversation,
      result: { handled: true, replies: [], events: ["human.takeover.active"] },
    };
  }

  const ctx: ProcessContext = {
    tenant: input.tenant,
    conversation,
    inboundText: input.text,
    interactiveId: input.interactiveId,
    locationAddress: input.locationAddress,
    flowResponseJson: input.flowResponseJson,
    referral: input.referral ?? conversation.referral,
  };

  const result = runActiveProcess(ctx);

  if (result.conversationPatch) {
    conversation = await updateConversation(
      conversation.id,
      result.conversationPatch,
    );
  }

  await dispatchReplies({
    tenant: input.tenant,
    to: input.customerWaId,
    conversationId: conversation.id,
    replies: result.replies,
  });

  if (result.events?.includes("booking.confirmed") || result.events?.includes("ctwa.convert_booking")) {
    void sendCtwaConversion({
      tenant: input.tenant,
      eventName: "Schedule",
      ctwaSourceId: conversation.ctwaSourceId ?? conversation.referral?.sourceId,
    }).catch(() => undefined);
  }
  if (result.events?.includes("payment.paid") || conversation.payment?.status === "paid") {
    void sendCtwaConversion({
      tenant: input.tenant,
      eventName: "Purchase",
      ctwaSourceId: conversation.ctwaSourceId ?? conversation.referral?.sourceId,
      valueIls: conversation.quote?.amountIls,
    }).catch(() => undefined);
  }

  return { conversation, result };
}

export async function triggerReminder(input: {
  tenant: Tenant;
  conversation: Conversation;
  kind: "t24" | "t2";
}) {
  if (!enabled(input.tenant, "reminders")) {
    return { skipped: true as const };
  }
  if (isOutboundBlockedByQuality(input.tenant)) {
    return { skipped: true as const, reason: "quality_red" as const };
  }
  const result = buildReminderMessages(
    input.tenant,
    input.conversation,
    input.kind,
  );
  if (result.conversationPatch) {
    await updateConversation(input.conversation.id, result.conversationPatch);
  }
  await dispatchReplies({
    tenant: input.tenant,
    to: input.conversation.customerWaId,
    conversationId: input.conversation.id,
    replies: result.replies,
  });
  return { skipped: false as const, result };
}

export async function triggerRetention(input: {
  tenant: Tenant;
  conversation: Conversation;
}) {
  if (!enabled(input.tenant, "retention")) return { skipped: true as const };
  if (isOutboundBlockedByQuality(input.tenant)) {
    return { skipped: true as const, reason: "quality_red" as const };
  }
  const result = handleRetention({
    tenant: input.tenant,
    conversation: input.conversation,
    inboundText: "",
  });
  if (result.conversationPatch) {
    await updateConversation(input.conversation.id, result.conversationPatch);
  }
  await dispatchReplies({
    tenant: input.tenant,
    to: input.conversation.customerWaId,
    conversationId: input.conversation.id,
    replies: result.replies,
  });
  return { skipped: false as const, result };
}
