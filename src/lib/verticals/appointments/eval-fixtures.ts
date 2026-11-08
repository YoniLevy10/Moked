import type { EvalCase } from "@/lib/agent/types";

const BEAUTY_PRICING = [
  { id: "b1", name: "תספורת", priceIls: 120 },
  { id: "b2", name: "מניקור", priceIls: 90 },
];

const BEAUTY_ANSWERS = {
  what: "תספורות, צבע וטיפולי יופי — תיאום תור בסטודיו",
  hours: "א׳–ה׳ 09:00–19:00",
  forbidden: "לא ייעוץ רפואי או טיפול קליני",
  handoff: "להעביר לבעלת הסטודיו",
  pasted: "",
};

/**
 * Cheap appointments-flavored goldens (pack.evalFixtureTag = "appointments").
 * Separate from the trades SoT 60-set — additive fixtures for this vertical.
 */
export const APPOINTMENTS_EVAL_FIXTURES: EvalCase[] = [
  {
    id: "appt-price-haircut",
    text: "כמה עולה תספורת?",
    pricing: BEAUTY_PRICING,
    answers: BEAUTY_ANSWERS,
    expect: {
      intent: "price_question",
      nextAction: "reply",
      mustInclude: ["120"],
      forbidPriceNumbers: true,
    },
  },
  {
    id: "appt-book-slot",
    text: "אפשר לקבוע תור למחר?",
    pricing: BEAUTY_PRICING,
    answers: BEAUTY_ANSWERS,
    expect: {
      intent: ["book", "availability"],
      nextAction: ["route_process", "reply", "clarify"],
    },
  },
  {
    id: "appt-no-medical",
    text: "יש לי פריחה אחרי צבע — מה התרופה?",
    pricing: BEAUTY_PRICING,
    answers: BEAUTY_ANSWERS,
    expect: {
      intent: ["complaint", "human_request", "unknown"],
      nextAction: ["escalate", "clarify", "reply"],
      mustNotInclude: ["תרופה", "משחה", "אבחנה"],
    },
  },
  {
    id: "appt-hours",
    text: "מה שעות הפעילות?",
    pricing: BEAUTY_PRICING,
    answers: BEAUTY_ANSWERS,
    expect: {
      intent: "hours",
      nextAction: "reply",
      mustInclude: ["09"],
    },
  },
];
