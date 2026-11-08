import { nanoid } from "nanoid";
import type { ProcessKey, Tenant, TenantAvailability } from "@/lib/types";
import type { TenantKnowledgeRow } from "@/lib/agent/types";

/** Appointment niches — beauty / coach only (no medical clinics). */
export type AppointmentKind = "beauty" | "coach";

export type AppointmentNichePack = {
  kind: AppointmentKind;
  labelHe: string;
  greeting: string;
  what: string;
  hours: string;
  handoff: string;
  forbidden: string;
  questions: string[];
  adLines: string[];
  landingHeadline: string;
  landingSub: string;
  pricing: Array<{ name: string; priceIls: number; description: string }>;
};

export const APPOINTMENT_PACKS: Record<AppointmentKind, AppointmentNichePack> = {
  beauty: {
    kind: "beauty",
    labelHe: "יופי / טיפוח",
    greeting: "היי! רוצה לקבוע תור או לשאול על טיפול?",
    what: "תספורות, צבע, מניקור/פדיקור, טיפולי פנים ועיצוב — תיאום תור בסטודיו.",
    hours: "א׳–ה׳ 09:00–19:00 · ו׳ עד 14:00",
    handoff: "בקשת סגנון מורכב / אלרגיה לחומרים — נעביר לבעל/ת העסק לפני התור.",
    forbidden:
      "לא נותנים ייעוץ רפואי או טיפול קליני. לא מבטיחים תוצאה אסתטית סופית בלי פגישת ייעוץ.",
    questions: [
      "איזה טיפול מעניין אותך?",
      "מתי נוח לתור?",
      "יש העדפת עובד/ת או אילוץ?",
      "ביקור ראשון אצלנו?",
    ],
    adLines: [
      "תור ליופי ב־WhatsApp — בלי לחכות בטלפון",
      "סטודיו באזורכם · קביעת תור למספר החדש",
    ],
    landingHeadline: "סטודיו יופי שמגיב ב־WhatsApp",
    landingSub: "שלחו הודעה למספר הפרסום — נקבע תור בלי להתקשר.",
    pricing: [
      { name: "תספורת", priceIls: 120, description: "תספורת רגילה" },
      { name: "צבע שורשים", priceIls: 280, description: "צביעת שורשים סטנדרטית" },
      { name: "מניקור", priceIls: 90, description: "מניקור קלאסי" },
    ],
  },
  coach: {
    kind: "coach",
    labelHe: "אימון / ייעוץ",
    greeting: "שלום! שמחים שפנית. איזה נושא מעניין אותך?",
    what: "מפגשי אימון אישי, ליווי מטרות, ופגישות ייעוץ קצרות — תיאום תור ביומן.",
    hours: "א׳–ה׳ 09:00–18:00 · ו׳ עד 13:00",
    handoff: "משבר / נושא רפואי או משפטי — נעביר לבעל העסק ולא ניתן ייעוץ מקצועי בבוט.",
    forbidden:
      "לא ייעוץ רפואי, משפטי או פיננסי מחייב. לא מאבחנים ולא מבטיחים תוצאות טיפוליות.",
    questions: [
      "על איזה נושא תרצה/י לעבוד?",
      "מתי נוח לתור?",
      "פגישה ראשונה או המשך ליווי?",
      "פרונטלי או אונליין?",
    ],
    adLines: [
      "קביעת תור לאימון ב־WhatsApp",
      "מאמן/ת באזור · מספר ייעודי לפרסום",
    ],
    landingHeadline: "אימון שמגיב ב־WhatsApp",
    landingSub: "מספר חדש לפרסום — תיאום תור בלי שרשרת הודעות.",
    pricing: [
      { name: "פגישת היכרות", priceIls: 0, description: "שיחת היכרות קצרה (לרוב ללא עלות)" },
      { name: "מפגש אימון", priceIls: 350, description: "מפגש אישי ~60 דק׳" },
      { name: "חבילת 4 מפגשים", priceIls: 1200, description: "ארבעה מפגשים מראש" },
    ],
  },
};

export function resolveAppointmentKind(
  input?: string | null,
): AppointmentKind {
  const key = (input ?? "").toLowerCase().trim();
  if (key === "coach") return "coach";
  if (key === "beauty") return "beauty";
  // Tenant.vertical may already be beauty|coach when niche omitted.
  if (key in APPOINTMENT_PACKS) return key as AppointmentKind;
  return "beauty";
}

/** Process preset — Wave D payment stays off (same as trades beachhead). */
export function appointmentsProcessPreset(): Tenant["processes"] {
  const on = (enabled: boolean) => ({
    enabled,
    config: {} as Record<string, unknown>,
  });
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
    const enabled =
      key === "intake" ||
      key === "qualification" ||
      key === "booking" ||
      key === "quote";
    processes[key] = on(enabled);
  }
  return processes;
}

/** Denser in-studio / meeting slots than site-visit trades capacity. */
export function defaultAppointmentsAvailability(): TenantAvailability {
  const weekday = [0, 1, 2, 3, 4].map((day) => ({
    day,
    startHour: 9,
    endHour: 19,
  }));
  return {
    timezone: "Asia/Jerusalem",
    windows: [...weekday, { day: 5, startHour: 9, endHour: 14 }],
    dailyCapacity: 10,
  };
}

export function applyAppointmentsPackToTenant(
  tenant: Tenant,
  appointmentKind?: string | null,
): Tenant {
  const kind = resolveAppointmentKind(
    appointmentKind ??
      (tenant.vertical === "coach" || tenant.vertical === "beauty"
        ? tenant.vertical
        : "beauty"),
  );
  const pack = APPOINTMENT_PACKS[kind];
  return {
    ...tenant,
    // Persist concrete vertical already in the DB enum (no migration).
    vertical: kind,
    processes: appointmentsProcessPreset(),
    availability:
      tenant.availability?.windows?.length && tenant.availability.dailyCapacity > 0
        ? tenant.availability
        : defaultAppointmentsAvailability(),
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
      googleCalendar: false,
      paymentsProvider: "none",
    },
  };
}

export function appointmentsKnowledgeRows(
  tenantId: string,
  appointmentKind?: string | null,
): TenantKnowledgeRow[] {
  const pack = APPOINTMENT_PACKS[resolveAppointmentKind(appointmentKind)];
  const now = new Date().toISOString();
  const rows: TenantKnowledgeRow[] = [
    {
      id: `appt_faq_scope_${tenantId}`,
      tenantId,
      kind: "faq",
      label: "scope",
      body: pack.what,
      meta: { appointmentKind: pack.kind, bookingModel: "appointment" },
      updatedAt: now,
    },
    {
      id: `appt_policy_forbidden_${tenantId}`,
      tenantId,
      kind: "forbidden",
      label: "forbidden",
      body: pack.forbidden,
      meta: { appointmentKind: pack.kind },
      updatedAt: now,
    },
    {
      id: `appt_policy_handoff_${tenantId}`,
      tenantId,
      kind: "policy",
      label: "handoff",
      body: pack.handoff,
      meta: { appointmentKind: pack.kind },
      updatedAt: now,
    },
    {
      id: `appt_hours_${tenantId}`,
      tenantId,
      kind: "hours",
      label: "hours",
      body: pack.hours,
      meta: { appointmentKind: pack.kind },
      updatedAt: now,
    },
    {
      id: `appt_policy_booking_${tenantId}`,
      tenantId,
      kind: "policy",
      label: "booking_model",
      body: "קביעת תור במקום העסק / אונליין — בלי ביקור טכנאי בכתובת הלקוח.",
      meta: { appointmentKind: pack.kind, bookingModel: "appointment" },
      updatedAt: now,
    },
  ];
  pack.questions.forEach((q, i) => {
    rows.push({
      id: `appt_q_${i}_${tenantId}`,
      tenantId,
      kind: "faq",
      label: `question_${i + 1}`,
      body: q,
      meta: { appointmentKind: pack.kind, role: "qualification" },
      updatedAt: now,
    });
  });
  return rows;
}

export function appointmentsLandingCopy(appointmentKind?: string | null) {
  const pack = APPOINTMENT_PACKS[resolveAppointmentKind(appointmentKind)];
  return {
    kind: pack.kind,
    labelHe: pack.labelHe,
    headline: pack.landingHeadline,
    sub: pack.landingSub,
    adLines: pack.adLines,
    questions: pack.questions,
  };
}

/** Wave A qualification prompts for in-place appointments (not site visits). */
export const APPOINTMENTS_QUALIFICATION_QUESTIONS = [
  "מתי נוח לקבוע תור? (היום / מחר / השבוע / גמיש)",
  "איזה שירות / טיפול מעניין אותך?",
  "יש פרט שכדאי שנדע לפני התור?",
] as const;
