import { ProcessContext, ProcessResult } from "@/lib/processes/types";
import { createPaymentLink } from "@/lib/integrations/payments";

export function handlePayment(ctx: ProcessContext): ProcessResult {
  const amount =
    ctx.conversation.quote?.amountIls ??
    ctx.tenant.pricing[0]?.priceIls ??
    0;
  const provider = ctx.tenant.integrations.paymentsProvider;

  if (provider === "none") {
    return {
      handled: true,
      replies: [
        {
          body: "גבייה עדיין לא מחוברת. בעל העסק ישלח קישור תשלום ידנית.",
          processKey: "payment",
        },
      ],
      events: ["payment.blocked_no_provider"],
    };
  }

  if (ctx.conversation.payment?.status === "link_sent") {
    if (/שילמתי|שולם|paid/i.test(ctx.inboundText)) {
      return {
        handled: true,
        replies: [
          {
            body: "תודה! התשלום התקבל. נשלח קבלה בהקדם.",
            processKey: "payment",
          },
        ],
        conversationPatch: {
          payment: { ...ctx.conversation.payment, status: "paid" },
          activeProcess: undefined,
        },
        events: ["payment.paid"],
      };
    }
    return {
      handled: true,
      replies: [
        {
          body: `הקישור עדיין פעיל:\n${ctx.conversation.payment.linkUrl}\nלאחר התשלום כתוב/י "שילמתי".`,
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
        body: `לסיום — קישור לתשלום מאובטח (₪${amount}):\n${link.url}\n\nאחרי התשלום השב/י "שילמתי".`,
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
