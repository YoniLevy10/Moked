import { ProcessContext, ProcessResult } from "@/lib/processes/types";
import { proposeSlotsForTenant } from "@/lib/integrations/calendar";
import { listConversations } from "@/lib/store/db";

/**
 * Wave A booking:
 * 1) propose slots from tenant availability (hours + capacity)
 * 2) confirm slot
 * 3) collect address (MVP, matches live demo)
 */
export async function handleBooking(ctx: ProcessContext): Promise<ProcessResult> {
  const state = ctx.conversation.processState ?? {};
  const booking = ctx.conversation.booking ?? {};
  const text = ctx.inboundText.trim();

  // Step 1 — offer slots
  if (!booking.proposedSlots?.length) {
    const conversations = await listConversations(ctx.tenant.id);
    const bookedStartsAt = conversations
      .map((c) => c.booking?.startsAt)
      .filter((iso): iso is string => Boolean(iso));
    const slots = proposeSlotsForTenant(ctx.tenant, { bookedStartsAt });
    if (slots.length === 0) {
      return {
        handled: true,
        replies: [
          {
            body: "אין כרגע חלונות ביקור פתוחים ביומן העסק. בעל העסק יחזור אליך לתאם מועד.",
            processKey: "booking",
          },
        ],
        conversationPatch: {
          activeProcess: "booking",
          processState: {
            ...state,
            bookingOffered: true,
            bookingStep: "no_availability",
          },
        },
        events: ["booking.no_availability"],
      };
    }
    const prefer = typeof state.preferTime === "string" ? state.preferTime : "";
    const hint = prefer ? `\n(ציינת קודם: ${prefer})` : "";
    const lines = slots
      .map((slot, i) => `${i + 1}) ${slot.label}`)
      .join("\n");
    return {
      handled: true,
      replies: [
        {
          body: `אפשרויות קרובות:${hint}\n${lines}\n\nהשב/י ${slots
            .map((_, i) => String(i + 1))
            .join(", ")} — או כתוב/י מועד אחר.`,
          type: "interactive",
          processKey: "booking",
        },
      ],
      conversationPatch: {
        activeProcess: "booking",
        booking: { proposedSlots: slots.map((slot) => slot.label) },
        processState: {
          ...state,
          bookingOffered: true,
          bookingStep: "slot",
          slotStartsAt: slots.map((slot) => slot.startsAt),
        },
      },
      events: ["booking.proposed"],
    };
  }

  // Step 2 — confirm slot (if not yet confirmed)
  if (!booking.confirmedAt) {
    const choices = (booking.proposedSlots ?? []).map((_, i) => String(i + 1));
    const idx = choices.includes(text) ? Number(text) - 1 : -1;
    const starts = Array.isArray(state.slotStartsAt) ? state.slotStartsAt : [];
    const confirmed =
      idx >= 0 && booking.proposedSlots
        ? booking.proposedSlots[idx]
        : text.length > 2
          ? text
          : null;
    const startsAt =
      idx >= 0 && typeof starts[idx] === "string" ? starts[idx] : undefined;

    if (!confirmed) {
      return {
        handled: true,
        replies: [
          {
            body: `לא הצלחתי להבין את המועד. השב/י ${choices.join(", ")} — או כתוב/י תאריך ושעה.`,
            processKey: "booking",
          },
        ],
      };
    }

    return {
      handled: true,
      replies: [
        {
          body: `מעולה, שמרתי את ${confirmed}.\nמה הכתובת המלאה לביקור?`,
          processKey: "booking",
        },
      ],
      conversationPatch: {
        activeProcess: "booking",
        booking: {
          ...booking,
          confirmedAt: confirmed,
          startsAt,
          reminder24Sent: false,
          reminder2Sent: false,
        },
        processState: {
          ...state,
          bookingStep: "address",
          slotConfirmed: confirmed,
          startsAt,
        },
      },
      events: ["booking.slot_chosen"],
    };
  }

  // Step 3 — address
  if (state.bookingStep === "address" || !state.address) {
    if (text.length < 4) {
      return {
        handled: true,
        replies: [
          {
            body: "צריך כתובת מלאה — לדוגמה: רמב״ן 14, ירושלים",
            processKey: "booking",
          },
        ],
      };
    }

    return {
      handled: true,
      replies: [
        {
          body: `מצוין! הביקור נקבע ל־${booking.confirmedAt} ב־${text}.\nנשלח תזכורת לפני המועד. בעל העסק רואה את הליד בדשבורד.`,
          processKey: "booking",
        },
      ],
      conversationPatch: {
        activeProcess: undefined,
        booking: {
          ...booking,
        },
        processState: {
          ...state,
          address: text,
          bookingConfirmed: true,
          bookingStep: "done",
          waveADone: true,
        },
      },
      events: ["booking.confirmed", "wave_a.completed"],
    };
  }

  return {
    handled: true,
    replies: [
      {
        body: `התור כבר סגור ל־${booking.confirmedAt}. אפשר לכתוב "הצעה" או "תשלום" אם צריך.`,
        processKey: "booking",
      },
    ],
  };
}
