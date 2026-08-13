import { ProcessContext, ProcessResult } from "@/lib/processes/types";
import { proposeSlots } from "@/lib/integrations/calendar";

/**
 * Wave A booking:
 * 1) propose slots
 * 2) confirm slot
 * 3) collect address (MVP, matches live demo)
 */
export function handleBooking(ctx: ProcessContext): ProcessResult {
  const state = ctx.conversation.processState ?? {};
  const booking = ctx.conversation.booking ?? {};
  const text = ctx.inboundText.trim();

  // Step 1 — offer slots
  if (!booking.proposedSlots?.length) {
    const slots = proposeSlots();
    const prefer = typeof state.preferTime === "string" ? state.preferTime : "";
    const hint = prefer ? `\n(ציינת קודם: ${prefer})` : "";
    return {
      handled: true,
      replies: [
        {
          body: `אפשרויות קרובות:${hint}\n1) ${slots[0]}\n2) ${slots[1]}\n3) ${slots[2]}\n\nהשב/י 1, 2 או 3 — או כתוב/י מועד אחר.`,
          type: "interactive",
          processKey: "booking",
        },
      ],
      conversationPatch: {
        activeProcess: "booking",
        booking: { proposedSlots: slots },
        processState: { ...state, bookingOffered: true, bookingStep: "slot" },
      },
      events: ["booking.proposed"],
    };
  }

  // Step 2 — confirm slot (if not yet confirmed)
  if (!booking.confirmedAt) {
    const idx = ["1", "2", "3"].includes(text) ? Number(text) - 1 : -1;
    const confirmed =
      idx >= 0 && booking.proposedSlots
        ? booking.proposedSlots[idx]
        : text.length > 2
          ? text
          : null;

    if (!confirmed) {
      return {
        handled: true,
        replies: [
          {
            body: "לא הצלחתי להבין את המועד. השב/י 1, 2 או 3 — או כתוב/י תאריך ושעה.",
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
          reminder24Sent: false,
          reminder2Sent: false,
        },
        processState: {
          ...state,
          bookingStep: "address",
          slotConfirmed: confirmed,
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
