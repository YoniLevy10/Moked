import { ProcessContext, ProcessResult } from "@/lib/processes/types";
import { createPaymentLink } from "@/lib/integrations/payments";
import { customerPaymentsEnabled } from "@/lib/product/flags";

export function handlePayment(ctx: ProcessContext): ProcessResult {
  if (!customerPaymentsEnabled()) {
    return {
      handled: true,
      replies: [
        {
          body: "גביית לקוח קצה עדיין לא פעילה בגרסה זו. נמשיך עם תיאום ביקור והצעת מחיר.",
          processKey: "payment",
        },
      ],
      events: ["payment.blocked_no_provider"],
    };
  }

  const amount =
    ctx.conversation.quote?.amountIls ??
    ctx.tenant.pricing[0]?.priceIls ??
    0;
  let provider = ctx.tenant.integrations.paymentsProvider;

  // In demo WhatsApp mode, auto-use demo PSP so Wave D is testable.
  if (provider === "none" && ctx.tenant.whatsapp.mode === "demo") {
    provider = "demo";
  }

  if (provider === "none") {
    return {
      handled: true,
      replies: [
        {
          body: "גבייה עדיין לא מחוברת. חברו ספק (או השאירו demo) במסך חיבורים.",
          processKey: "payment",
        },
      ],
      events: ["payment.blocked_no_provider"],
    };
  }

  if (ctx.conversation.payment?.status === "link_sent") {
    // Customer "שילמתי" is acknowledgement only — never mark paid without PSP webhook.
    if (/שילמתי|שולם|paid/i.test(ctx.inboundText)) {
      return {
        handled: true,
        replies: [
          {
            body: "קיבלנו. ברגע שהתשלום יאומת אצל ספק הסליקה נשלח אישור וקבלה.",
            processKey: "payment",
          },
        ],
        events: ["payment.pending_verification"],
      };
    }
    return {
      handled: true,
      replies: [
        {
          body: `הקישור עדיין פעיל:\n${ctx.conversation.payment.linkUrl}\nלאחר התשלום כתוב/י "שילמתי" — האישור הסופי מגיע מספק הסליקה.`,
          processKey: "payment",
        },
      ],
    };
  }

  const link = createPaymentLink({
    provider,
    amountIls: amount,
    description: ctx.conversation.quote?.itemId ?? "MOKED payment",
    tenantId: ctx.tenant.id,
    conversationId: ctx.conversation.id,
  });

  return {
    handled: true,
    replies: [
      {
        body: `לסיום — קישור לתשלום (₪${amount}):\n${link.url}\n\nאחרי התשלום אפשר לכתוב "שילמתי"; האישור הסופי מגיע מספק הסליקה.`,
        processKey: "payment",
      },
    ],
    conversationPatch: {
      activeProcess: "payment",
      payment: {
        linkUrl: link.url,
        status: "link_sent",
        provider,
      },
    },
    events: ["payment.link_sent"],
  };
}
