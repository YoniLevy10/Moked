import { ProcessContext, ProcessResult } from "@/lib/processes/types";

const QUESTIONS = [
  "מתי נוח שנתאם ביקור?",
  "באיזה אזור / עיר?",
  "יש פרט חשוב שכדאי שנדע לפני הביקור?",
];

const TIME_BUTTONS = [
  { id: "time_today", title: "היום", value: "היום" },
  { id: "time_tomorrow", title: "מחר", value: "מחר" },
  { id: "time_week", title: "השבוע", value: "השבוע" },
];

function normalizeAnswer(ctx: ProcessContext): string {
  if (ctx.interactiveId) {
    const btn = TIME_BUTTONS.find((b) => b.id === ctx.interactiveId);
    if (btn) return btn.value;
  }
  if (ctx.flowResponseJson) {
    try {
      const parsed = JSON.parse(ctx.flowResponseJson) as Record<string, unknown>;
      const vals = Object.values(parsed).filter((v) => typeof v === "string");
      if (vals.length) return vals.join(" | ");
    } catch {
      /* ignore */
    }
  }
  return ctx.inboundText.trim();
}

function scoreAnswers(answers: string[]): number {
  let score = 35;
  const blob = answers.join(" ").toLowerCase();
  if (/היום|דחוף|עכשיו|מיידי|אחה.?צ|בוקר/.test(blob)) score += 25;
  if (/מחר|השבוע/.test(blob)) score += 15;
  if (/גמיש/.test(blob)) score += 5;
  if (
    /ירושלים|תל אביב|חיפה|באר שבע|רמת גן|פתח תקווה|נתניה|אשדוד|חולון|רחובות|חדרה|מודיעין|אזור|עיר/.test(
      blob,
    )
  ) {
    score += 20;
  } else if (answers[1] && answers[1].trim().length >= 2) {
    score += 10;
  }
  if (answers[2] && answers[2].trim().length >= 4) score += 10;
  if (/נזילה|חשמל|מזגן|סתימה|תקלה|כואב/.test(blob)) score += 10;
  return Math.min(100, score);
}

export function handleQualification(ctx: ProcessContext): ProcessResult {
  const state = ctx.conversation.processState ?? {};
  const step = Number(state.qualificationStep ?? 0);
  const answers = Array.isArray(state.qualificationAnswers)
    ? ([...state.qualificationAnswers] as string[])
    : [];

  if (ctx.flowResponseJson && !state.qualificationDone) {
    const answer = normalizeAnswer(ctx);
    const score = scoreAnswers([answer]);
    const hot = score >= 50;
    const bookingEnabled = Boolean(ctx.tenant.processes.booking?.enabled);
    return {
      handled: true,
      replies: [
        {
          body: hot
            ? "מעולה — נשמע רלוונטי. בוא/י נסגור מועד."
            : "תודה על הפרטים. בעל העסק יעבור על הפנייה ויחזור אליך בהקדם.",
          processKey: "qualification",
        },
      ],
      conversationPatch: {
        leadScore: score,
        activeProcess: hot && bookingEnabled ? "booking" : undefined,
        processState: {
          ...state,
          qualificationDone: true,
          qualificationAnswers: [answer],
          handoffToBooking: hot && bookingEnabled,
        },
      },
      events: hot
        ? ["lead.qualified", "lead.hot"]
        : ["lead.qualified", "lead.warm_or_cold"],
    };
  }

  if (!state.qualificationAsked) {
    return {
      handled: true,
      replies: [
        {
          body: QUESTIONS[0],
          type: "interactive",
          processKey: "qualification",
          interactive: {
            kind: "buttons",
            buttons: TIME_BUTTONS.map(({ id, title }) => ({ id, title })),
          },
        },
      ],
      conversationPatch: {
        activeProcess: "qualification",
        processState: {
          ...state,
          qualificationAsked: true,
          qualificationStep: 0,
          qualificationAnswers: [],
        },
      },
      events: ["lead.qualification_started"],
    };
  }

  const answer = normalizeAnswer(ctx);
  if (!answer) {
    return {
      handled: true,
      replies: [
        {
          body: "לא קיבלתי תשובה — אפשר לבחור או לכתוב בקצרה?",
          type: "interactive",
          processKey: "qualification",
          interactive: {
            kind: "buttons",
            buttons: TIME_BUTTONS.map(({ id, title }) => ({ id, title })),
          },
        },
      ],
    };
  }

  answers.push(answer);
  const nextStep = step + 1;

  if (nextStep < QUESTIONS.length) {
    if (nextStep === 1) {
      return {
        handled: true,
        replies: [
          {
            body: QUESTIONS[1],
            type: "interactive",
            processKey: "qualification",
            interactive: { kind: "location_request" },
          },
        ],
        conversationPatch: {
          activeProcess: "qualification",
          processState: {
            ...state,
            qualificationStep: nextStep,
            qualificationAnswers: answers,
            preferTime: answers[0],
          },
        },
      };
    }
    return {
      handled: true,
      replies: [{ body: QUESTIONS[nextStep], processKey: "qualification" }],
      conversationPatch: {
        activeProcess: "qualification",
        processState: {
          ...state,
          qualificationStep: nextStep,
          qualificationAnswers: answers,
          preferTime: answers[0],
          area: answers[1],
        },
      },
    };
  }

  const score = scoreAnswers(answers);
  const hot = score >= 50;
  const bookingEnabled = Boolean(ctx.tenant.processes.booking?.enabled);

  return {
    handled: true,
    replies: [
      {
        body: hot
          ? "מעולה — נשמע רלוונטי. בוא/י נסגור מועד."
          : "תודה על הפרטים. בעל העסק יעבור על הפנייה ויחזור אליך בהקדם.",
        processKey: "qualification",
      },
    ],
    conversationPatch: {
      leadScore: score,
      activeProcess: hot && bookingEnabled ? "booking" : undefined,
      processState: {
        ...state,
        qualificationStep: nextStep,
        qualificationAnswers: answers,
        qualificationDone: true,
        preferTime: answers[0],
        area: answers[1],
        notes: answers[2],
        handoffToBooking: hot && bookingEnabled,
      },
    },
    events: hot
      ? ["lead.qualified", "lead.hot"]
      : ["lead.qualified", "lead.warm_or_cold"],
  };
}
