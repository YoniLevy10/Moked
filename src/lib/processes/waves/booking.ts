import { ProcessContext, ProcessResult } from "@/lib/processes/types";
import { proposeSlots } from "@/lib/integrations/calendar";

export function handleBooking(ctx: ProcessContext): ProcessResult {
  const state = ctx.conversation.processState ?? {};
  const booking = ctx.conversation.booking ?? {};

  if (!booking.proposedSlots?.length) {
    const slots = proposeSlots();
    return {
      handled: true,
      replies: [
        {
          body: `אפשרויות קרובות:\n1) ${slots[0]}\n2) ${slots[1]}\n3) ${slots[2]}\n\nהשב/י במספר 1, 2 או 3 — או כתוב/י מועד אחר.`,
          type: "interactive",
          processKey: "booking",
        },
      ],
      conversationPatch: {
        activeProcess: "booking",
        booking: { proposedSlots: slots },
        processState: { ...state, bookingOffered: true },
      },
      events: ["booking.proposed"],
    };
  }

  const text = ctx.inboundText.trim();
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
        body: `מצוין! המועד נקבע ל־${confirmed}.\nנשלח תזכורת לפני המועד. להתראות 🙂`,
        processKey: "booking",
      },
    ],
    conversationPatch: {
      activeProcess: undefined,
      booking: {
        ...booking,
        confirmedAt: confirmed,
        reminder24Sent: false,
        reminder2Sent: false,
      },
      processState: { ...state, bookingConfirmed: true },
    },
    events: ["booking.confirmed"],
  };
}
