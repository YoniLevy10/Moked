import { ProcessContext, ProcessResult } from "@/lib/processes/types";
import { proposeSlots } from "@/lib/integrations/calendar";

export function handleBooking(ctx: ProcessContext): ProcessResult {
  const state = ctx.conversation.processState ?? {};
  const booking = ctx.conversation.booking ?? {};
  const text = ctx.inboundText.trim();
  const interactiveId = ctx.interactiveId;

  if (!booking.proposedSlots?.length) {
    const flowId = ctx.tenant.metaFeatures?.bookingFlowId;
    const flowName = ctx.tenant.metaFeatures?.bookingFlowName;
    if (flowId || flowName) {
      return {
        handled: true,
        replies: [
          {
            body: "בחרו מועד בטופס:",
            type: "interactive",
            processKey: "booking",
            interactive: {
              kind: "flow",
              flowId,
              flowName,
              screen: "BOOKING",
            },
          },
        ],
        conversationPatch: {
          activeProcess: "booking",
          processState: { ...state, bookingOffered: true, bookingStep: "flow" },
        },
        events: ["booking.proposed"],
      };
    }

    const slots = proposeSlots();
    const prefer = typeof state.preferTime === "string" ? state.preferTime : "";
    const hint = prefer ? `\n(ציינת קודם: ${prefer})` : "";
    return {
      handled: true,
      replies: [
        {
          body: `אפשרויות קרובות:${hint}`,
          type: "interactive",
          processKey: "booking",
          interactive: {
            kind: "list",
            buttonLabel: "בחרו מועד",
            sections: [
              {
                title: "מועדים",
                rows: slots.map((slot, i) => ({
                  id: `slot_${i + 1}`,
                  title: `אפשרות ${i + 1}`,
                  description: slot,
                })),
              },
            ],
          },
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

  if (!booking.confirmedAt) {
    let confirmed: string | null = null;
    if (interactiveId?.startsWith("slot_")) {
      const idx = Number(interactiveId.replace("slot_", "")) - 1;
      confirmed = booking.proposedSlots?.[idx] ?? null;
    } else if (["1", "2", "3"].includes(text)) {
      confirmed = booking.proposedSlots?.[Number(text) - 1] ?? null;
    } else if (ctx.flowResponseJson) {
      try {
        const parsed = JSON.parse(ctx.flowResponseJson) as Record<string, unknown>;
        const slot = Object.values(parsed).find((v) => typeof v === "string");
        if (typeof slot === "string") confirmed = slot;
      } catch {
        /* ignore */
      }
    } else if (text.length > 2) {
      confirmed = text;
    }

    if (!confirmed) {
      return {
        handled: true,
        replies: [
          {
            body: "לא הצלחתי להבין את המועד. בחרו מהרשימה או כתבו תאריך ושעה.",
            processKey: "booking",
          },
        ],
      };
    }

    return {
      handled: true,
      replies: [
        {
          body: `מעולה, שמרתי את ${confirmed}.\nשלחו את מיקום הביקור (או כתבו כתובת מלאה):`,
          type: "interactive",
          processKey: "booking",
          interactive: { kind: "location_request" },
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

  if (state.bookingStep === "address" || !state.address) {
    const address = ctx.locationAddress || text;
    if (address.length < 4) {
      return {
        handled: true,
        replies: [
          {
            body: "צריך כתובת מלאה — אפשר לשלוח מיקום או לכתוב: רמב״ן 14, ירושלים",
            type: "interactive",
            processKey: "booking",
            interactive: { kind: "location_request" },
          },
        ],
      };
    }

    return {
      handled: true,
      replies: [
        {
          body: `מצוין! הביקור נקבע ל־${booking.confirmedAt} ב־${address}.\nנשלח תזכורת לפני המועד. בעל העסק רואה את הליד בדשבורד.`,
          processKey: "booking",
        },
      ],
      conversationPatch: {
        activeProcess: undefined,
        booking: { ...booking },
        processState: {
          ...state,
          address,
          bookingConfirmed: true,
          bookingStep: "done",
          waveADone: true,
        },
      },
      events: ["booking.confirmed", "wave_a.completed", "ctwa.convert_booking"],
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
