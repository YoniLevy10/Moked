import { ProcessContext, ProcessResult } from "@/lib/processes/types";

const QUESTIONS = [
  "איזה שירות מעניין אותך?",
  "מתי היית רוצה להתחיל? (היום / השבוע / גמיש)",
  "באיזה אזור את/ה נמצא/ת?",
];

export function handleQualification(ctx: ProcessContext): ProcessResult {
  const state = ctx.conversation.processState ?? {};
  const step = Number(state.qualificationStep ?? 0);
  const answers = Array.isArray(state.qualificationAnswers)
    ? ([...state.qualificationAnswers] as string[])
    : [];

  // First question already asked by intake handoff — record answer on next message.
  if (!state.qualificationAsked) {
    return {
      handled: true,
      replies: [{ body: QUESTIONS[0], processKey: "qualification" }],
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

  answers.push(ctx.inboundText.trim());
  const nextStep = step + 1;

  if (nextStep < QUESTIONS.length) {
    return {
      handled: true,
      replies: [{ body: QUESTIONS[nextStep], processKey: "qualification" }],
      conversationPatch: {
        activeProcess: "qualification",
        processState: {
          ...state,
          qualificationStep: nextStep,
          qualificationAnswers: answers,
        },
      },
    };
  }

  const score = Math.min(100, 40 + answers.join(" ").length);
  const hot = score >= 55;
  const bookingEnabled = Boolean(ctx.tenant.processes.booking?.enabled);

  return {
    handled: true,
    replies: [
      {
        body: hot
          ? "מעולה, נשמע רלוונטי. בוא/י נמצא מועד שמתאים לך."
          : "תודה על הפרטים. נחזור אליך עם הצעה מתאימה בהקדם.",
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
        handoffToBooking: hot && bookingEnabled,
      },
    },
    events: ["lead.qualified"],
  };
}
