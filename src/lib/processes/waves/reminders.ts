import { ProcessContext, ProcessResult } from "@/lib/processes/types";
import { Conversation, Tenant } from "@/lib/types";
import { HE_TEMPLATES } from "@/lib/whatsapp/he-templates";

/** Wave B — proactive reminders (scheduler or dashboard trigger). */
export function buildReminderMessages(
  tenant: Tenant,
  conversation: Conversation,
  kind: "t24" | "t2",
): ProcessResult {
  const when = conversation.booking?.confirmedAt ?? "המועד שנקבע";
  const template =
    kind === "t24" ? HE_TEMPLATES.reminder_t24 : HE_TEMPLATES.reminder_t2;
  const body =
    kind === "t24"
      ? `תזכורת מ־${tenant.businessName}: מחר יש לך תור ל־${when}.\nהשב/י מאשר / לדחות / לבטל`
      : `תזכורת: בעוד כשעתיים התור שלך (${when}).\nהשב/י מאשר / לדחות / לבטל.`;

  return {
    handled: true,
    replies: [
      {
        body,
        type: "template",
        processKey: "reminders",
        template: {
          name: template.name,
          languageCode: "he",
          bodyParameters: [tenant.businessName, when],
        },
      },
      {
        body: "בחרו פעולה:",
        type: "interactive",
        processKey: "reminders",
        interactive: {
          kind: "buttons",
          buttons: [
            { id: "remind_confirm", title: "מאשר" },
            { id: "remind_reschedule", title: "לדחות" },
            { id: "remind_cancel", title: "לבטל" },
          ],
        },
      },
    ],
    conversationPatch: {
      activeProcess: "reminders",
      booking: {
        ...conversation.booking,
        reminder24Sent:
          kind === "t24" ? true : conversation.booking?.reminder24Sent,
        reminder2Sent:
          kind === "t2" ? true : conversation.booking?.reminder2Sent,
      },
      processState: {
        ...conversation.processState,
        reminderKind: kind,
        awaitingAttendance: true,
      },
    },
    events: ["reminder.sent"],
  };
}

export function handleReminderReply(ctx: ProcessContext): ProcessResult {
  const t = ctx.inboundText.trim();
  const id = ctx.interactiveId;

  if (
    id === "remind_confirm" ||
    /מאשר|מאשרת|כן|ok|אוקי/i.test(t)
  ) {
    return {
      handled: true,
      replies: [
        {
          body: "מעולה, ההגעה אושרה. מחכים לך!",
          processKey: "reminders",
        },
      ],
      conversationPatch: {
        activeProcess: undefined,
        booking: { ...ctx.conversation.booking, attended: true },
        processState: {
          ...ctx.conversation.processState,
          awaitingAttendance: false,
        },
      },
      events: ["attendance.confirmed"],
    };
  }

  if (id === "remind_reschedule" || /דח|מחר|יום אחר|להזיז/i.test(t)) {
    return {
      handled: true,
      replies: [
        {
          body: "אין בעיה — כתוב/י מועד חלופי (למשל: מחר ב־10:00) ונעדכן.",
          processKey: "reminders",
        },
      ],
      conversationPatch: {
        activeProcess: "reminders",
        processState: {
          ...ctx.conversation.processState,
          reminderReschedule: true,
        },
      },
      events: ["reminder.reschedule_requested"],
    };
  }

  if (ctx.conversation.processState?.reminderReschedule && t.length > 2) {
    return {
      handled: true,
      replies: [
        {
          body: `עודכן: המועד החדש הוא ${t}. נשלח תזכורת לפני.`,
          processKey: "reminders",
        },
      ],
      conversationPatch: {
        activeProcess: undefined,
        booking: {
          ...ctx.conversation.booking,
          confirmedAt: t,
          reminder24Sent: false,
          reminder2Sent: false,
          attended: undefined,
        },
        processState: {
          ...ctx.conversation.processState,
          reminderReschedule: false,
          awaitingAttendance: false,
        },
      },
      events: ["booking.rescheduled"],
    };
  }

  if (id === "remind_cancel" || /בטל|לא יכול|לא מגיע/i.test(t)) {
    return {
      handled: true,
      replies: [
        {
          body: "ביטלתי את התור. נשמח לתאם מועד חדש כשתרצו — פשוט כתבו \"תור\".",
          processKey: "reminders",
        },
      ],
      conversationPatch: {
        activeProcess: undefined,
        booking: {
          ...ctx.conversation.booking,
          confirmedAt: undefined,
          attended: false,
        },
        processState: {
          ...ctx.conversation.processState,
          bookingCancelled: true,
          awaitingAttendance: false,
        },
      },
      events: ["booking.cancelled_by_customer"],
    };
  }

  return { handled: false, replies: [] };
}
