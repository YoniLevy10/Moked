import { ProcessContext, ProcessResult } from "@/lib/processes/types";
import { greetingFor } from "@/lib/store/db";

const SUPPORT_HINTS = ["תמיכה", "בעיה", "תלונה", "לא עובד", "עזרה"];
const SPAM_HINTS = ["השקעה מובטחת", "crypto", "פורקס", "הלוואה מהירה"];

function detectIntent(text: string): "sales" | "support" | "spam" | "unknown" {
  const t = text.toLowerCase();
  if (SPAM_HINTS.some((h) => t.includes(h))) return "spam";
  if (SUPPORT_HINTS.some((h) => t.includes(h))) return "support";
  if (text.trim().length > 0) return "sales";
  return "unknown";
}

export function handleIntake(ctx: ProcessContext): ProcessResult {
  const intent = detectIntent(ctx.inboundText);
  const greeting = greetingFor(ctx.tenant);
  const qualificationEnabled = Boolean(
    ctx.tenant.processes.qualification?.enabled,
  );

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
          body: `${greeting}\n\nראיתי שמדובר בנושא תמיכה — מעביר/ה אותך בהקדם לטיפול אישי.`,
          processKey: "intake",
        },
      ],
      conversationPatch: {
        intent,
        activeProcess: undefined,
        processState: {
          ...ctx.conversation.processState,
          intakeDone: true,
        },
      },
      events: ["lead.created", "intake.completed"],
    };
  }

  const replies: ProcessResult["replies"] = [
    {
      body: `${greeting}\n\nכדי להתאים לך מענה מדויק, אשאל כמה שאלות קצרות.`,
      processKey: "intake",
    },
  ];

  if (qualificationEnabled) {
    replies.push({
      body: "איזה שירות מעניין אותך?",
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
        qualificationAsked: qualificationEnabled,
        qualificationStep: 0,
        qualificationAnswers: [],
      },
    },
    events: ["lead.created", "message.sent", "intake.completed"],
  };
}
