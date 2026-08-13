import { ProcessContext, ProcessResult } from "@/lib/processes/types";
import { greetingFor } from "@/lib/store/db";

const SUPPORT_HINTS = [
  "תמיכה",
  "בעיה במערכת",
  "תלונה",
  "לא עובד האפליקציה",
  "עזרה טכנית",
];
const SPAM_HINTS = ["השקעה מובטחת", "crypto", "פורקס", "הלוואה מהירה", "היכרויות"];
const SALES_HINTS = [
  "נזילה",
  "אינסטלציה",
  "חשמל",
  "מזגן",
  "תיקון",
  "קצר",
  "סתימה",
  "תור",
  "לקבוע",
  "מחיר",
  "הצעה",
  "ביקור",
  "טכנאי",
  "ניקיון",
  "טיפול",
];

function detectIntent(text: string): "sales" | "support" | "spam" | "unknown" {
  const t = text.toLowerCase();
  if (SPAM_HINTS.some((h) => t.includes(h.toLowerCase()))) return "spam";
  if (SUPPORT_HINTS.some((h) => t.includes(h.toLowerCase()))) return "support";
  if (SALES_HINTS.some((h) => t.includes(h.toLowerCase()))) return "sales";
  if (text.trim().length > 0) return "sales";
  return "unknown";
}

export function handleIntake(ctx: ProcessContext): ProcessResult {
  const intent = detectIntent(ctx.inboundText);
  const greeting = greetingFor(ctx.tenant);
  const qualificationEnabled = Boolean(
    ctx.tenant.processes.qualification?.enabled,
  );
  const issue = ctx.inboundText.trim();

  if (intent === "spam") {
    return {
      handled: true,
      replies: [],
      conversationPatch: {
        intent: "spam",
        status: "closed",
        activeProcess: undefined,
      },
      events: ["lead.created", "intake.spam_filtered"],
    };
  }

  if (intent === "support") {
    return {
      handled: true,
      replies: [
        {
          body: `${greeting}\n\nראיתי שמדובר בנושא תמיכה — מעביר/ה אותך בהקדם לטיפול אישי של בעל העסק.`,
          processKey: "intake",
        },
      ],
      conversationPatch: {
        intent,
        activeProcess: undefined,
        processState: {
          ...ctx.conversation.processState,
          intakeDone: true,
          issue,
          needsHuman: true,
        },
      },
      events: ["lead.created", "intake.completed", "intake.support_escalated"],
    };
  }

  const replies: ProcessResult["replies"] = [
    {
      body: `${greeting}\n\nקיבלתי: «${issue.slice(0, 120)}».\nכדי להתאים מענה מדויק, אשאל כמה שאלות קצרות.`,
      processKey: "intake",
    },
  ];

  if (qualificationEnabled) {
    replies.push({
      body: "מתי נוח שנתאם ביקור? (היום / מחר / השבוע / גמיש)",
      processKey: "qualification",
    });
  }

  return {
    handled: true,
    replies,
    conversationPatch: {
      intent,
      activeProcess: qualificationEnabled ? "qualification" : undefined,
      processState: {
        ...ctx.conversation.processState,
        intakeDone: true,
        issue,
        qualificationAsked: qualificationEnabled,
        qualificationStep: 0,
        qualificationAnswers: [],
      },
    },
    events: ["lead.created", "message.sent", "intake.completed"],
  };
}
