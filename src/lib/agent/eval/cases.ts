import { EvalCase } from "@/lib/agent/types";

const DEFAULT_PRICING = [
  { id: "p1", name: "ביקור טכנאי", priceIls: 250 },
  { id: "p2", name: "התקנת מזגן", priceIls: 1200 },
  { id: "p3", name: "תיקון דוד", priceIls: 450 },
];

const DEFAULT_ANSWERS = {
  what: "שירותי מיזוג, חשמל ואינסטלציה לבית",
  hours: "א׳–ה׳ 08:00–18:00",
  forbidden: "לא לתת אבחנה רפואית או התחייבות לאחריות לכל החיים",
  handoff: "להעביר ליוסי בטלפון",
  pasted: "",
};

const AREA_KNOWLEDGE = [
  {
    kind: "area" as const,
    label: "service_area",
    body: "גוש דן והשרון",
  },
];

function base(
  partial: Omit<EvalCase, "pricing" | "answers" | "knowledge"> & {
    pricing?: EvalCase["pricing"];
    answers?: EvalCase["answers"];
    knowledge?: EvalCase["knowledge"];
  },
): EvalCase {
  return {
    pricing: partial.pricing ?? DEFAULT_PRICING,
    answers: partial.answers ?? DEFAULT_ANSWERS,
    knowledge: partial.knowledge ?? AREA_KNOWLEDGE,
    ...partial,
  };
}

/** 60 golden conversations — SoT Part F. */
export const AGENT_EVAL_CASES: EvalCase[] = [
  // --- 8 price questions (3 unknown service → escalate, no invented number) ---
  base({
    id: "price-known-1",
    text: "כמה עולה ביקור טכנאי?",
    expect: {
      intent: "price_question",
      nextAction: "reply",
      mustInclude: ["250"],
      forbidPriceNumbers: true,
    },
  }),
  base({
    id: "price-known-2",
    text: "מה המחיר להתקנת מזגן",
    expect: {
      intent: "price_question",
      nextAction: "reply",
      mustInclude: ["1200"],
      forbidPriceNumbers: true,
    },
  }),
  base({
    id: "price-known-3",
    text: "תיקון דוד כמה?",
    expect: {
      intent: "price_question",
      nextAction: "reply",
      mustInclude: ["450"],
      forbidPriceNumbers: true,
    },
  }),
  base({
    id: "price-known-4",
    text: "how much for ביקור טכנאי",
    language: "en",
    expect: {
      intent: "price_question",
      nextAction: "reply",
      mustInclude: ["250"],
      forbidPriceNumbers: true,
    },
  }),
  base({
    id: "price-known-5",
    text: "بكم زيارة فني؟",
    language: "ar",
    expect: {
      intent: ["price_question", "unknown"],
      nextAction: ["reply", "escalate", "clarify"],
      forbidPriceNumbers: true,
    },
  }),
  base({
    id: "price-unknown-1",
    text: "כמה עולה החלפת גג רעפים מלא?",
    expect: {
      intent: "price_question",
      nextAction: "escalate",
      mustInclude: ["בודק"],
      mustNotInclude: ["₪1", "₪2", "₪3", "₪4", "₪5", "₪6", "₪7", "₪8", "₪9"],
      forbidPriceNumbers: true,
    },
  }),
  base({
    id: "price-unknown-2",
    text: "מחיר להתקנת בריכת שחייה בחצר",
    expect: {
      intent: "price_question",
      nextAction: "escalate",
      forbidPriceNumbers: true,
    },
  }),
  base({
    id: "price-unknown-3",
    text: "how much for helicopter roof inspection",
    language: "en",
    expect: {
      intent: "price_question",
      nextAction: "escalate",
      forbidPriceNumbers: true,
    },
  }),

  // --- 8 booking / availability ---
  base({
    id: "book-1",
    text: "אני רוצה לקבוע תור",
    expect: { intent: "book", nextAction: "route_process" },
  }),
  base({
    id: "book-2",
    text: "מחר ב־16:00 יש מקום?",
    expect: {
      intent: ["availability", "book"],
      nextAction: "route_process",
    },
  }),
  base({
    id: "book-3",
    text: "sometime next week please",
    language: "en",
    expect: {
      intent: ["availability", "book"],
      nextAction: "route_process",
    },
  }),
  base({
    id: "book-4",
    text: "אפשר ביקור מחר בארבע",
    expect: {
      intent: ["availability", "book"],
      nextAction: "route_process",
    },
  }),
  base({
    id: "book-5",
    text: "קבעו לי מועד לשבוע הבא",
    expect: {
      intent: ["book", "availability"],
      nextAction: "route_process",
    },
  }),
  base({
    id: "book-6",
    text: "יש פנוי ביום ראשון?",
    expect: {
      intent: ["availability", "book"],
      nextAction: "route_process",
    },
  }),
  base({
    id: "book-7",
    text: "schedule a visit tomorrow at 4",
    language: "en",
    expect: {
      intent: ["book", "availability"],
      nextAction: "route_process",
    },
  }),
  base({
    id: "book-8",
    text: "רוצה לקבוע ביקור טכנאי אצלי",
    expect: { intent: "book", nextAction: "route_process" },
  }),

  // --- 6 typos / slang ---
  base({
    id: "typo-1",
    text: "כמה עולה ביקור טכנאייי",
    expect: {
      intent: "price_question",
      nextAction: ["reply", "escalate", "clarify"],
      forbidPriceNumbers: true,
    },
  }),
  base({
    id: "typo-2",
    text: "מחררר יש תור?",
    expect: {
      intent: ["availability", "book", "unknown"],
      nextAction: ["route_process", "clarify", "escalate", "reply"],
    },
  }),
  base({
    id: "typo-3",
    text: "יאללה תקבעו לי משהו",
    expect: {
      intent: ["book", "unknown", "smalltalk"],
      nextAction: ["route_process", "clarify", "reply", "escalate"],
    },
  }),
  base({
    id: "typo-4",
    text: "שעעעות פעילות?",
    expect: {
      intent: ["hours", "unknown"],
      nextAction: ["reply", "clarify", "escalate"],
    },
  }),
  base({
    id: "typo-5",
    text: "תתקנו לי דוד כמה זה",
    expect: {
      intent: "price_question",
      nextAction: ["reply", "escalate"],
      forbidPriceNumbers: true,
    },
  }),
  base({
    id: "typo-6",
    text: "בוקר טובבב מה השעות",
    expect: {
      intent: ["hours", "smalltalk"],
      nextAction: ["reply", "route_process", "clarify"],
    },
  }),

  // --- 6 Arabic ---
  base({
    id: "ar-1",
    text: "بكم تركيب مكيف؟",
    language: "ar",
    expect: {
      intent: ["price_question", "unknown"],
      nextAction: ["reply", "escalate", "clarify"],
      forbidPriceNumbers: true,
    },
  }),
  base({
    id: "ar-2",
    text: "أريد حجز موعد",
    language: "ar",
    expect: {
      intent: ["book", "unknown"],
      nextAction: ["route_process", "clarify", "escalate", "reply"],
    },
  }),
  base({
    id: "ar-3",
    text: "ما هي ساعات العمل؟",
    language: "ar",
    expect: {
      intent: ["hours", "unknown"],
      nextAction: ["reply", "clarify", "escalate"],
    },
  }),
  base({
    id: "ar-4",
    text: "تحدث مع إنسان من فضلك",
    language: "ar",
    expect: {
      intent: ["human_request", "unknown"],
      nextAction: ["escalate", "clarify"],
    },
  }),
  base({
    id: "ar-5",
    text: "منطقة الخدمة وين؟",
    language: "ar",
    expect: {
      intent: ["service_area", "unknown"],
      nextAction: ["reply", "clarify", "escalate"],
    },
  }),
  base({
    id: "ar-6",
    text: "عندكم شكوى من فني سيء",
    language: "ar",
    expect: {
      intent: ["complaint", "unknown"],
      nextAction: ["escalate", "clarify"],
    },
  }),

  // --- 5 complaints / angry ---
  base({
    id: "complaint-1",
    text: "אני כועס המון, השירות גרוע",
    expect: { intent: "complaint", nextAction: "escalate" },
  }),
  base({
    id: "complaint-2",
    text: "זועמת! אף אחד לא חזר אליי",
    expect: { intent: "complaint", nextAction: "escalate" },
  }),
  base({
    id: "complaint-3",
    text: "I want to file a complaint, this is terrible",
    language: "en",
    expect: { intent: "complaint", nextAction: "escalate" },
  }),
  base({
    id: "complaint-4",
    text: "תלונה רשמית על הטכנאי שלכם",
    expect: { intent: "complaint", nextAction: "escalate" },
  }),
  base({
    id: "complaint-5",
    text: "לא מרוצה בכלל מהעבודה",
    expect: { intent: "complaint", nextAction: "escalate" },
  }),

  // --- 4 human requests ---
  base({
    id: "human-1",
    text: "אפשר לדבר עם אדם?",
    expect: { intent: "human_request", nextAction: "escalate" },
  }),
  base({
    id: "human-2",
    text: "תעביר אותי לנציג",
    expect: { intent: "human_request", nextAction: "escalate" },
  }),
  base({
    id: "human-3",
    text: "I need a real person please",
    language: "en",
    expect: { intent: "human_request", nextAction: "escalate" },
  }),
  base({
    id: "human-4",
    text: "תחבר אותי למנהל",
    expect: { intent: "human_request", nextAction: "escalate" },
  }),

  // --- 4 unrelated ---
  base({
    id: "unrelated-1",
    text: "מה דעתך על ביטקוין עכשיו",
    expect: {
      intent: "unknown",
      nextAction: ["escalate", "clarify", "reply"],
    },
  }),
  base({
    id: "unrelated-2",
    text: "lottery winning tips please",
    language: "en",
    expect: {
      intent: "unknown",
      nextAction: ["escalate", "clarify", "reply"],
    },
  }),
  base({
    id: "unrelated-3",
    text: "השקעות פורקס מומלצות?",
    expect: {
      intent: "unknown",
      nextAction: ["escalate", "clarify", "reply"],
    },
  }),
  base({
    id: "unrelated-4",
    text: "can you write my school essay",
    language: "en",
    expect: {
      intent: ["unknown", "smalltalk"],
      nextAction: ["escalate", "clarify", "reply", "route_process"],
    },
  }),

  // --- 3 discount attempts ---
  base({
    id: "discount-1",
    text: "תעשו לי הנחה על ביקור טכנאי",
    expect: {
      intent: "price_question",
      nextAction: "escalate",
      forbidPriceNumbers: true,
    },
  }),
  base({
    id: "discount-2",
    text: "can I get a discount on התקנת מזגן",
    language: "en",
    expect: {
      intent: "price_question",
      nextAction: "escalate",
      forbidPriceNumbers: true,
    },
  }),
  base({
    id: "discount-3",
    text: "זול יותר בבקשה על תיקון דוד",
    expect: {
      intent: "price_question",
      nextAction: "escalate",
      forbidPriceNumbers: true,
    },
  }),

  // --- 2 duplicates (same text twice; classifier still valid) ---
  base({
    id: "dup-1",
    text: "כמה עולה ביקור טכנאי?",
    expect: {
      intent: "price_question",
      nextAction: "reply",
      mustInclude: ["250"],
      forbidPriceNumbers: true,
    },
  }),
  base({
    id: "dup-2",
    text: "כמה עולה ביקור טכנאי?",
    expect: {
      intent: "price_question",
      nextAction: "reply",
      mustInclude: ["250"],
      forbidPriceNumbers: true,
    },
  }),

  // --- 4 outside hours / hours questions ---
  base({
    id: "hours-1",
    text: "מה השעות שלכם?",
    expect: {
      intent: "hours",
      nextAction: "reply",
      mustInclude: ["08:00"],
    },
  }),
  base({
    id: "hours-2",
    text: "אתם פתוחים בשישי?",
    expect: {
      intent: "hours",
      nextAction: ["reply", "clarify"],
    },
  }),
  base({
    id: "hours-3",
    text: "what are your opening hours",
    language: "en",
    expect: {
      intent: "hours",
      nextAction: "reply",
    },
  }),
  base({
    id: "hours-4",
    text: "מתי אתם סגורים",
    expect: {
      intent: "hours",
      nextAction: ["reply", "clarify"],
    },
  }),

  // --- extras to reach 60: opt-out, bot ask, area, service info, cancel/reschedule ---
  base({
    id: "optout-1",
    text: "stop",
    language: "en",
    expect: { intent: "opt_out", nextAction: "opt_out" },
  }),
  base({
    id: "optout-2",
    text: "תפסיק לשלוח לי הודעות",
    expect: { intent: "opt_out", nextAction: "opt_out" },
  }),
  base({
    id: "bot-1",
    text: "אתה בוט?",
    expect: {
      intent: "smalltalk",
      nextAction: "reply",
      mustInclude: ["דיגיטלי"],
    },
  }),
  base({
    id: "area-1",
    text: "אתם מגיעים לרעננה? אזור שירות",
    expect: {
      intent: "service_area",
      nextAction: "reply",
      mustInclude: ["גוש דן"],
    },
  }),
  base({
    id: "service-1",
    text: "מה אתם עושים בעצם",
    expect: {
      intent: "service_info",
      nextAction: "reply",
    },
  }),
  base({
    id: "cancel-1",
    text: "אני רוצה לבטל את התור",
    expect: {
      intent: "cancel",
      nextAction: "route_process",
    },
  }),
  base({
    id: "reschedule-1",
    text: "אפשר לשנות מועד?",
    expect: {
      intent: "reschedule",
      nextAction: "route_process",
    },
  }),
  base({
    id: "smalltalk-hi",
    text: "שלום",
    expect: {
      intent: "smalltalk",
      nextAction: ["route_process", "reply"],
    },
  }),
  base({
    id: "price-known-6",
    text: "מחיר לביקור טכנאי בבקשה",
    expect: {
      intent: "price_question",
      nextAction: "reply",
      mustInclude: ["250"],
      forbidPriceNumbers: true,
    },
  }),
  base({
    id: "availability-slots",
    text: "יש זמינות מחר אחרי הצהריים?",
    expect: {
      intent: ["availability", "book"],
      nextAction: "route_process",
    },
  }),
];

if (AGENT_EVAL_CASES.length !== 60) {
  throw new Error(
    `AGENT_EVAL_CASES must have 60 cases, got ${AGENT_EVAL_CASES.length}`,
  );
}
