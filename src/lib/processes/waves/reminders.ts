import { Conversation, Tenant } from "@/lib/types";
import { ProcessResult } from "@/lib/processes/types";

/** Wave B — proactive reminders (usually triggered by scheduler, not inbound). */
export function buildReminderMessages(
  tenant: Tenant,
  conversation: Conversation,
  kind: "t24" | "t2",
): ProcessResult {
  const when = conversation.booking?.confirmedAt ?? "המועד שנקבע";
  const body =
    kind === "t24"
      ? `תזכורת מ־${tenant.businessName}: מחר יש לך תור ל־${when}. השב/י "מאשר" לאישור הגעה.`
      : `תזכורת: בעוד כשעתיים התור שלך (${when}). נתראה!`;

  return {
    handled: true,
    replies: [{ body, type: "template", processKey: "reminders" }],
    conversationPatch: {
      booking: {
        ...conversation.booking,
        reminder24Sent:
          kind === "t24" ? true : conversation.booking?.reminder24Sent,
        reminder2Sent:
          kind === "t2" ? true : conversation.booking?.reminder2Sent,
      },
    },
    events: ["reminder.sent"],
  };
}

export function handleReminderReply(inboundText: string): ProcessResult {
  const t = inboundText.trim();
  if (/מאשר|מאשרת|כן|ok|אוקי/i.test(t)) {
    return {
      handled: true,
      replies: [
        {
          body: "מעולה, ההגעה אושרה. מחכים לך!",
          processKey: "reminders",
        },
      ],
      conversationPatch: {
        booking: { attended: true },
      },
      events: ["attendance.confirmed"],
    };
  }
  return { handled: false, replies: [] };
}
