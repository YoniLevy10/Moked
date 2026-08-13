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
import { ProcessResult } from "@/lib/processes/types";
import { sendWhatsAppText } from "@/lib/whatsapp/client";

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
    const reminder = handleReminderReply(inboundText);
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

export async function handleInboundMessage(input: {
  tenant: Tenant;
  customerWaId: string;
  customerName?: string;
  text: string;
  metaMessageId?: string;
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

  await addMessage({
    conversationId: conversation.id,
    tenantId: input.tenant.id,
    direction: "inbound",
    body: input.text,
    type: "text",
    metaMessageId: input.metaMessageId,
  });

  if (conversation.status === "human_takeover") {
    return {
      conversation,
      result: { handled: true, replies: [], events: ["human.takeover.active"] },
    };
  }

  const result = runActiveProcess(input.tenant, conversation, input.text);

  if (result.conversationPatch) {
    conversation = await updateConversation(
      conversation.id,
      result.conversationPatch,
    );
  }

  for (const reply of result.replies) {
    await sendWhatsAppText({
      tenant: input.tenant,
      to: input.customerWaId,
      body: reply.body,
    });
    await addMessage({
      conversationId: conversation.id,
      tenantId: input.tenant.id,
      direction: "outbound",
      body: reply.body,
      type: reply.type ?? "text",
      processKey: reply.processKey,
    });
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
  const result = buildReminderMessages(
    input.tenant,
    input.conversation,
    input.kind,
  );
  if (result.conversationPatch) {
    await updateConversation(input.conversation.id, result.conversationPatch);
  }
  for (const reply of result.replies) {
    await sendWhatsAppText({
      tenant: input.tenant,
      to: input.conversation.customerWaId,
      body: reply.body,
    });
    await addMessage({
      conversationId: input.conversation.id,
      tenantId: input.tenant.id,
      direction: "outbound",
      body: reply.body,
      type: "template",
      processKey: "reminders",
    });
  }
  return { skipped: false as const, result };
}

export async function triggerRetention(input: {
  tenant: Tenant;
  conversation: Conversation;
}) {
  if (!enabled(input.tenant, "retention")) return { skipped: true as const };
  const result = handleRetention({
    tenant: input.tenant,
    conversation: input.conversation,
    inboundText: "",
  });
  if (result.conversationPatch) {
    await updateConversation(input.conversation.id, result.conversationPatch);
  }
  for (const reply of result.replies) {
    await sendWhatsAppText({
      tenant: input.tenant,
      to: input.conversation.customerWaId,
      body: reply.body,
    });
    await addMessage({
      conversationId: input.conversation.id,
      tenantId: input.tenant.id,
      direction: "outbound",
      body: reply.body,
      type: "template",
      processKey: "retention",
    });
  }
  return { skipped: false as const, result };
}
