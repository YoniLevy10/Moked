import { nanoid } from "nanoid";
import type { ProcessKey, Tenant } from "@/lib/types";
import type { TenantKnowledgeRow } from "@/lib/agent/types";

/** Beachhead trade niches — clinics out of scope for v1. */
export type TradeKind =
  | "renovation"
  | "hvac"
  | "electrical"
  | "plumbing"
  | "handyman";

export type TradePack = {
  kind: TradeKind;
  labelHe: string;
  greeting: string;
  what: string;
  hours: string;
  handoff: string;
  forbidden: string;
  /** Qualification questions the intake agent should cover. */
  questions: string[];
  /** Ad / landing Hebrew one-liners (new number only). */
  adLines: string[];
  landingHeadline: string;
  landingSub: string;
  pricing: Array<{ name: string; priceIls: number; description: string }>;
};

export const TRADE_PACKS: Record<TradeKind, TradePack> = {
  plumbing: {
    kind: "plumbing",
    labelHe: "אינסטלציה",
    greeting: "היי! קיבלנו את הפנייה לאינסטלציה. במה מדובר?",
    what: "תיקוני נזילות, סתימות, החלפת ברזים, התקנות מים וביוב לבית ולעסק.",
    hours: "א׳–ה׳ 08:00–18:00 · ו׳ עד 13:00 · חירום לפי זמינות",
    handoff: "אם זו הצפה / אין מים / ריח גז — נעביר מיד לטכנאי.",
    forbidden: "לא נותנים מחיר סופי בלי ביקור או תמונות ברורות של התקלה.",
    questions: [
      "איפה התקלה בבית?",
      "יש נזילה פעילה עכשיו?",
      "אפשר לשלוח תמונה?",
      "מתי נוח לביקור?",
    ],
    adLines: [
      "נזילה? כתבו עכשיו — מענה מהיר ב־WhatsApp",
      "אינסטלטור באזורכם · קביעת ביקור בלי להתקשר",
    ],
    landingHeadline: "אינסטלטור שמגיב ב־WhatsApp",
    landingSub: "שלחו הודעה למספר החדש — נקבע ביקור בלי טלפון.",
    pricing: [
      { name: "ביקור אבחון", priceIls: 180, description: "ביקור + אבחון תקלה" },
      { name: "פתיחת סתימה", priceIls: 320, description: "סתימה סטנדרטית" },
      { name: "תיקון נזילה", priceIls: 450, description: "תיקון בסיסי אחרי אבחון" },
    ],
  },
  electrical: {
    kind: "electrical",
    labelHe: "חשמל",
    greeting: "היי! פנייה לחשמלאי. מה קרה?",
    what: "תקלות חשמל, לוחות, נקודות, תאורה, התקנות בטוחות לפי תקן.",
    hours: "א׳–ה׳ 08:00–17:30 · חירום קצרים לפי זמינות",
    handoff: "ריח שרוף / ניצוצות / נפילות חוזרות — העברה מיידית לחשמלאי.",
    forbidden: "לא מייעצים לעקוף מפסקים או לעבוד על לוח בלי חשמלאי מוסמך.",
    questions: [
      "מה התקלה בדיוק?",
      "יש ריח שרוף או ניצוצות?",
      "איזה אזור בבית?",
      "מתי נוח לביקור?",
    ],
    adLines: [
      "חשמלאי באזור · כתבו למספר החדש",
      "תקלת חשמל? מענה ב־WhatsApp תוך דקה",
    ],
    landingHeadline: "חשמלאי שמגיב ב־WhatsApp",
    landingSub: "מספר ייעודי לפרסום — המספר האישי שלכם נשאר פרטי.",
    pricing: [
      { name: "ביקור אבחון", priceIls: 200, description: "ביקור + בדיקת בטיחות" },
      { name: "תיקון נקודה", priceIls: 280, description: "שקע / מפסק / תאורה" },
      { name: "עבודת לוח", priceIls: 650, description: "תיקון/שדרוג לוח (הצעה אחרי ביקור)" },
    ],
  },
  hvac: {
    kind: "hvac",
    labelHe: "מיזוג וקירור",
    greeting: "היי! פנייה למיזוג. במה אפשר לעזור?",
    what: "התקנה, תחזוקה ותיקון מזגנים · ניקוי · מילוי גז לפי הצורך.",
    hours: "א׳–ה׳ 08:00–18:00 · ו׳ עד 13:00",
    handoff: "אין קירור בחום כבד / ריח חריג מהמכשיר — העברה לטכנאי.",
    forbidden: "לא מבטיחים מחיר התקנה בלי סוג יחידה ומיקום.",
    questions: [
      "איזה סוג מזגן?",
      "תיקון או התקנה?",
      "כמה יחידות?",
      "מתי נוח לביקור?",
    ],
    adLines: [
      "מזגן לא מקרר? כתבו עכשיו",
      "התקנת מזגן · תיאום ביקור ב־WhatsApp",
    ],
    landingHeadline: "מיזוג שמגיב ב־WhatsApp",
    landingSub: "מספר חדש לפרסום — תיאום ביקור בלי להתקשר שוב ושוב.",
    pricing: [
      { name: "ביקור שירות", priceIls: 220, description: "אבחון מזגן" },
      { name: "ניקוי יחידה", priceIls: 280, description: "ניקוי בסיסי" },
      { name: "מילוי גז", priceIls: 480, description: "לפי סוג גז ואחרי בדיקה" },
    ],
  },
  renovation: {
    kind: "renovation",
    labelHe: "שיפוצים",
    greeting: "היי! פנייה לשיפוצים. ספרו בקצרה מה הפרויקט.",
    what: "שיפוץ חדרים, אמבטיה, מטבח, עבודות גמר ושיפוץ כללי בתיאום ביקור.",
    hours: "א׳–ה׳ 08:00–17:00",
    handoff: "פרויקט גדול / כמה חדרים — נעביר לבעל העסק להצעה מפורטת.",
    forbidden: "לא נותנים מחיר סופי לשיפוץ בלי ביקור מדידה.",
    questions: [
      "איזה חלל משפצים?",
      "יש תכניות או תמונות?",
      "מתי רצוי להתחיל?",
      "מה התקציב הגס?",
    ],
    adLines: [
      "שיפוץ? קבלו מענה ב־WhatsApp למספר החדש",
      "תיאום ביקור מדידה בלי טלפונים",
    ],
    landingHeadline: "שיפוצניק שמגיב ב־WhatsApp",
    landingSub: "שלחו תמונות למספר הפרסום — נקבע ביקור מדידה.",
    pricing: [
      { name: "ביקור מדידה", priceIls: 0, description: "ביקור הצעת מחיר (לרוב ללא עלות)" },
      { name: "שיפוץ חדר רטוב", priceIls: 12000, description: "הצעה התחלתית — סופי אחרי מדידה" },
      { name: "עבודת גמר יומית", priceIls: 900, description: "יום עבודה גמר" },
    ],
  },
  handyman: {
    kind: "handyman",
    labelHe: "הנדימן / תיקונים",
    greeting: "היי! פנייה לתיקונים בבית. מה צריך?",
    what: "תיקונים קטנים בבית, הרכבות, דלתות, מדפים, תיקוני כלליים.",
    hours: "א׳–ה׳ 09:00–18:00 · ו׳ עד 13:00",
    handoff: "עבודה שדורשת רישיון חשמל/גז/מים — נפנה לבעל מקצוע מתאים.",
    forbidden: "לא מבטיחים מחיר קבוע בלי תיאור או תמונה.",
    questions: [
      "מה צריך לתקן או להתקין?",
      "אפשר תמונה?",
      "דחוף להיום?",
      "מתי נוח לביקור?",
    ],
    adLines: [
      "תיקון בבית? כתבו למספר החדש",
      "הנדימן באזור · מענה ב־WhatsApp",
    ],
    landingHeadline: "הנדימן שמגיב ב־WhatsApp",
    landingSub: "מספר ייעודי לפרסום — קביעת ביקור בלי לחכות בטלפון.",
    pricing: [
      { name: "ביקור תיקון", priceIls: 150, description: "ביקור + תיקון קטן" },
      { name: "הרכבת מדף/טלוויזיה", priceIls: 220, description: "הרכבה סטנדרטית" },
      { name: "שעת עבודה", priceIls: 180, description: "תיקונים כלליים לפי שעה" },
    ],
  },
};

export function resolveTradeKind(
  input?: string | null,
): TradeKind {
  const key = (input ?? "").toLowerCase().trim();
  if (key in TRADE_PACKS) return key as TradeKind;
  return "plumbing";
}

/** Process preset for trades beachhead — Wave D payment stays off. */
export function tradesProcessPreset(): Tenant["processes"] {
  const on = (enabled: boolean) => ({ enabled, config: {} as Record<string, unknown> });
  const keys: ProcessKey[] = [
    "intake",
    "qualification",
    "booking",
    "reminders",
    "retention",
    "quote",
    "payment",
  ];
  const processes = {} as Tenant["processes"];
  for (const key of keys) {
    // Reminders stay off until Hebrew utility templates are approved
    // (readiness templates_approved becomes blocking when reminders are on).
    const enabled =
      key === "intake" ||
      key === "qualification" ||
      key === "booking" ||
      key === "quote";
    processes[key] = on(enabled);
  }
  return processes;
}

export function applyTradesPackToTenant(
  tenant: Tenant,
  tradeKind?: string | null,
): Tenant {
  const pack = TRADE_PACKS[resolveTradeKind(tradeKind)];
  return {
    ...tenant,
    vertical: "trades",
    processes: tradesProcessPreset(),
    pricing: pack.pricing.map((p) => ({
      id: nanoid(8),
      name: p.name,
      priceIls: p.priceIls,
      description: p.description,
    })),
    bot: {
      ...tenant.bot,
      draft:
        tenant.bot.draft ||
        `${pack.greeting}\n${pack.what}\nשעות: ${pack.hours}`,
      answers: {
        ...tenant.bot.answers,
        what: pack.what,
        hours: pack.hours,
        handoff: pack.handoff,
        forbidden: pack.forbidden,
      },
    },
    integrations: {
      ...tenant.integrations,
      // Slot scheduler does not require Google Calendar.
      googleCalendar: false,
      paymentsProvider: "none",
    },
  };
}

/** Extra FAQ / policy rows for tenant_knowledge (beyond pricing mirror). */
export function tradesKnowledgeRows(
  tenantId: string,
  tradeKind?: string | null,
): TenantKnowledgeRow[] {
  const pack = TRADE_PACKS[resolveTradeKind(tradeKind)];
  const now = new Date().toISOString();
  const rows: TenantKnowledgeRow[] = [
    {
      id: `trades_faq_scope_${tenantId}`,
      tenantId,
      kind: "faq",
      label: "scope",
      body: pack.what,
      meta: { tradeKind: pack.kind },
      updatedAt: now,
    },
    {
      id: `trades_policy_forbidden_${tenantId}`,
      tenantId,
      kind: "forbidden",
      label: "forbidden",
      body: pack.forbidden,
      meta: { tradeKind: pack.kind },
      updatedAt: now,
    },
    {
      id: `trades_policy_handoff_${tenantId}`,
      tenantId,
      kind: "policy",
      label: "handoff",
      body: pack.handoff,
      meta: { tradeKind: pack.kind },
      updatedAt: now,
    },
    {
      id: `trades_hours_${tenantId}`,
      tenantId,
      kind: "hours",
      label: "hours",
      body: pack.hours,
      meta: { tradeKind: pack.kind },
      updatedAt: now,
    },
  ];
  pack.questions.forEach((q, i) => {
    rows.push({
      id: `trades_q_${i}_${tenantId}`,
      tenantId,
      kind: "faq",
      label: `question_${i + 1}`,
      body: q,
      meta: { tradeKind: pack.kind, role: "qualification" },
      updatedAt: now,
    });
  });
  return rows;
}

export function tradesLandingCopy(tradeKind?: string | null) {
  const pack = TRADE_PACKS[resolveTradeKind(tradeKind)];
  return {
    kind: pack.kind,
    labelHe: pack.labelHe,
    headline: pack.landingHeadline,
    sub: pack.landingSub,
    adLines: pack.adLines,
    questions: pack.questions,
  };
}
