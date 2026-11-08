import { ProcessContext, ProcessResult } from "@/lib/processes/types";
import {
  qualificationQuestionsForVertical,
  slotPolicyForVertical,
} from "@/lib/verticals/registry";

function scoreAnswers(
  answers: string[],
  model: "site_visit" | "appointment",
): number {
  let score = 35;
  const blob = answers.join(" ").toLowerCase();

  if (/היום|דחוף|עכשיו|מיידי|אחה.?צ|בוקר/.test(blob)) score += 25;
  if (/מחר|השבוע/.test(blob)) score += 15;
  if (/גמיש/.test(blob)) score += 5;

  if (model === "appointment") {
    if (answers[1] && answers[1].trim().length >= 2) score += 20;
    if (
      /תספורת|צבע|מניקור|פדיקור|טיפול|אימון|מפגש|ייעוץ|אונליין|פרונטלי/.test(
        blob,
      )
    ) {
      score += 10;
    }
  } else {
    if (
      /ירושלים|תל אביב|חיפה|באר שבע|רמת גן|פתח תקווה|נתניה|אשדוד|חולון|רחובות|חדרה|מודיעין|אזור|עיר/.test(
        blob,
      )
    ) {
      score += 20;
    } else if (answers[1] && answers[1].trim().length >= 2) {
      score += 10;
    }
    if (/נזילה|חשמל|מזגן|סתימה|תקלה|כואב/.test(blob)) score += 10;
  }

  if (answers[2] && answers[2].trim().length >= 4) score += 10;

  return Math.min(100, score);
}

export function handleQualification(ctx: ProcessContext): ProcessResult {
  const state = ctx.conversation.processState ?? {};
  const step = Number(state.qualificationStep ?? 0);
  const answers = Array.isArray(state.qualificationAnswers)
    ? ([...state.qualificationAnswers] as string[])
    : [];
  const questions = qualificationQuestionsForVertical(ctx.tenant.vertical);
  const policy = slotPolicyForVertical(ctx.tenant.vertical);

  if (!state.qualificationAsked) {
    return {
      handled: true,
      replies: [{ body: questions[0], processKey: "qualification" }],
      conversationPatch: {
        activeProcess: "qualification",
        processState: {
          ...state,
          qualificationAsked: true,
          qualificationStep: 0,
          qualificationAnswers: [],
          bookingModel: policy.model,
        },
      },
      events: ["lead.qualification_started"],
    };
  }

  const answer = ctx.inboundText.trim();
  if (!answer) {
    return {
      handled: true,
      replies: [
        {
          body: "לא קיבלתי תשובה — אפשר לכתוב בקצרה?",
          processKey: "qualification",
        },
      ],
    };
  }

  answers.push(answer);
  const nextStep = step + 1;

  if (nextStep < questions.length) {
    return {
      handled: true,
      replies: [{ body: questions[nextStep], processKey: "qualification" }],
      conversationPatch: {
        activeProcess: "qualification",
        processState: {
          ...state,
          qualificationStep: nextStep,
          qualificationAnswers: answers,
          preferTime: answers[0],
          ...(policy.model === "appointment"
            ? { desiredService: answers[1] }
            : { area: answers[1] }),
          bookingModel: policy.model,
        },
      },
    };
  }

  const score = scoreAnswers(answers, policy.model);
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
        ...(policy.model === "appointment"
          ? { desiredService: answers[1] }
          : { area: answers[1] }),
        notes: answers[2],
        handoffToBooking: hot && bookingEnabled,
        bookingModel: policy.model,
      },
    },
    events: hot
      ? ["lead.qualified", "lead.hot"]
      : ["lead.qualified"],
  };
}
