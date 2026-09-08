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
        referral: ctx.referral,
        ctwaSourceId: ctx.referral?.sourceId,
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
        referral: ctx.referral,
        ctwaSourceId: ctx.referral?.sourceId,
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
    const flowId = ctx.tenant.metaFeatures?.qualificationFlowId;
    const flowName = ctx.tenant.metaFeatures?.qualificationFlowName;
    if (flowId || flowName) {
      replies.push({
        body: "מלאו את השאלון הקצר להמשך:",
        type: "interactive",
        processKey: "qualification",
        interactive: {
          kind: "flow",
          flowId,
          flowName,
          screen: "QUALIFY",
        },
      });
    } else {
      replies.push({
        body: "מתי נוח שנתאם ביקור?",
        type: "interactive",
        processKey: "qualification",
        interactive: {
          kind: "buttons",
          buttons: [
            { id: "time_today", title: "היום" },
            { id: "time_tomorrow", title: "מחר" },
            { id: "time_week", title: "השבוע" },
          ],
        },
      });
    }
  }

  return {
    handled: true,
    replies,
    conversationPatch: {
      intent,
      activeProcess: qualificationEnabled ? "qualification" : undefined,
      referral: ctx.referral,
      ctwaSourceId: ctx.referral?.sourceId,
      processState: {
        ...ctx.conversation.processState,
        intakeDone: true,
        issue,
        qualificationAsked: qualificationEnabled,
        qualificationStep: 0,
        qualificationAnswers: [],
      },
    },
    events: [
      "lead.created",
      "message.sent",
      "intake.completed",
      ...(ctx.referral?.sourceId ? ["ctwa.lead"] : []),
    ],
  };
}
