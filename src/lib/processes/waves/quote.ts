import { ProcessContext, ProcessResult } from "@/lib/processes/types";

export function handleQuote(ctx: ProcessContext): ProcessResult {
  const pricing = ctx.tenant.pricing;
  const state = ctx.conversation.processState ?? {};
  const quote = ctx.conversation.quote;
  const text = ctx.inboundText.trim();

  if (!pricing.length) {
    return {
      handled: true,
      replies: [
        {
          body: "עדיין לא הוגדר מחירון. בעל העסק יחזור אליך עם הצעה.",
          processKey: "quote",
        },
      ],
      events: ["quote.blocked_no_pricing"],
    };
  }

  if (state.awaitingDiscountDecision) {
    return {
      handled: true,
      replies: [
        {
          body: "הבקשה להנחה ממתינה לאישור בעל העסק — אחזור אליך מיד אחרי ההחלטה.",
          processKey: "quote",
        },
      ],
    };
  }

  if (!quote?.status || quote.status === "draft") {
    const lines = pricing
      .map((p, i) => `${i + 1}) ${p.name} — ₪${p.priceIls}`)
      .join("\n");
    return {
      handled: true,
      replies: [
        {
          body: `הנה ההצעות שלנו:\n${lines}\n\nהשב/י מספר לבחירה, "הנחה", או "לא תודה".`,
          type: "interactive",
          processKey: "quote",
        },
      ],
      conversationPatch: {
        activeProcess: "quote",
        quote: { status: "sent" },
        processState: { ...state, quoteOffered: true },
      },
      events: ["quote.sent"],
    };
  }

  if (/הנחה|זול|יקר/i.test(text)) {
    return {
      handled: true,
      replies: [
        {
          body: "קיבלתי בקשת הנחה — מעביר לבעל העסק לאישור (אנושי בהחלטות).",
          processKey: "quote",
        },
      ],
      conversationPatch: {
        activeProcess: "quote",
        processState: {
          ...state,
          awaitingDiscountDecision: true,
          discountRequested: true,
        },
      },
      events: ["quote.discount_requested", "human.decision_needed"],
    };
  }

  if (/לא|לא תודה|no/i.test(text)) {
    return {
      handled: true,
      replies: [
        {
          body: "אין בעיה, תודה על הזמן. אנחנו כאן אם תצטרך/י בעתיד.",
          processKey: "quote",
        },
      ],
      conversationPatch: {
        quote: { ...quote, status: "rejected" },
        activeProcess: undefined,
      },
      events: ["quote.rejected"],
    };
  }

  const idx = Number(text) - 1;
  const item = pricing[idx];
  if (!item) {
    return {
      handled: true,
      replies: [
        {
          body: "לא זיהיתי בחירה. השב/י מספר מהרשימה, \"הנחה\", או \"לא תודה\".",
          processKey: "quote",
        },
      ],
    };
  }

  const paymentEnabled = Boolean(ctx.tenant.processes.payment?.enabled);

  return {
    handled: true,
    replies: [
      {
        body: paymentEnabled
          ? `נהדר! בחרת "${item.name}" ב־₪${item.priceIls}. ממשיכים לגבייה.`
          : `נהדר! בחרת "${item.name}" ב־₪${item.priceIls}.\nאפשר להפעיל גל D (גבייה) ממסך התהליכים.`,
        processKey: "quote",
      },
    ],
    conversationPatch: {
      quote: {
        itemId: item.id,
        amountIls: item.priceIls,
        status: "accepted",
      },
      activeProcess: paymentEnabled ? "payment" : undefined,
      processState: {
        ...state,
        quoteAccepted: true,
        handoffToPayment: paymentEnabled,
        awaitingDiscountDecision: false,
      },
    },
    events: ["quote.accepted"],
  };
}
