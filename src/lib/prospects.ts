import { z } from "zod";

/**
 * Internal GTM prospects — product validation outreach for the MOKED team.
 * Not part of the customer-facing process OS.
 */

export const ProspectStatusSchema = z.enum([
  "new",
  "contacted",
  "replied",
  "interested",
  "not_interested",
  "demo_scheduled",
  "pilot",
  "converted",
  "discarded",
]);
export type ProspectStatus = z.infer<typeof ProspectStatusSchema>;

export const ProspectVerticalSchema = z.enum([
  "clinic",
  "trades",
  "coach",
  "beauty",
  "realty",
  "other",
]);
export type ProspectVertical = z.infer<typeof ProspectVerticalSchema>;

export const ProspectSchema = z.object({
  id: z.string(),
  businessName: z.string(),
  contactName: z.string().optional(),
  phone: z.string(),
  vertical: ProspectVerticalSchema.default("other"),
  source: z.string().default("manual"),
  status: ProspectStatusSchema.default("new"),
  notes: z.string().default(""),
  lastOutreachAt: z.string().optional(),
  lastOutreachChannel: z.enum(["wa_link", "api", "manual"]).optional(),
  interestScore: z.number().min(0).max(5).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Prospect = z.infer<typeof ProspectSchema>;

export const PROSPECT_STATUS_LABELS: Record<ProspectStatus, string> = {
  new: "חדש",
  contacted: "נוצר קשר",
  replied: "השיב/ה",
  interested: "מעוניין/ת",
  not_interested: "לא מעוניין/ת",
  demo_scheduled: "דמו נקבע",
  pilot: "פיילוט",
  converted: "הפך ללקוח",
  discarded: "נפסל",
};

export const PROSPECT_VERTICAL_LABELS: Record<ProspectVertical, string> = {
  trades: "בעלי מקצוע",
  clinic: "קליניקה",
  beauty: "יופי",
  coach: "ייעוץ",
  realty: "נדל״ן",
  other: "אחר",
};

/** Hebrew outreach templates for product-validation conversations. */
export const OUTREACH_TEMPLATES = [
  {
    id: "validation_short",
    nameHe: "וולידציה קצרה",
    body: `היי {name}, כאן מ־MOKED.

בונים מערכת שסוגרת לבד פניות בוואטסאפ של עסקים כמו {business} — קליטה, סינון, תור ותזכורות.

אפשר לשאול אותך שאלה אחת? האם היום פניות נכנסות נופלות בין הכיסאות כשאתה עמוס?`,
  },
  {
    id: "demo_offer",
    nameHe: "הצעת דמו 2 דקות",
    body: `היי {name}, ראיתי את {business}.

יש לנו דמו קצר (כ־2 דק׳) שמראה איך פנייה נכנסת בוואטסאפ הופכת לתור סגור בלי שתרדוף אחריה.

מתאים לך שאשלח קישור / שנקבע שיחה קצרה השבוע?`,
  },
  {
    id: "followup",
    nameHe: "פולואפ עדין",
    body: `היי {name}, רק מוודא שההודעה הקודמת הגיעה.

אם זה לא רלוונטי — אין בעיה, תגיד/י ואפסיק. אם כן — אשמח לדעת אם הנושא של פניות שלא נסגרות בוואטסאפ מדבר אליך.`,
  },
] as const;

export function renderOutreachTemplate(
  templateBody: string,
  prospect: Pick<Prospect, "businessName" | "contactName">,
): string {
  const name = prospect.contactName?.trim() || "שלום";
  return templateBody
    .replaceAll("{name}", name)
    .replaceAll("{business}", prospect.businessName);
}

/** Normalize Israeli phones to digits for wa.me (972…). */
export function toWhatsAppE164Digits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return `972${digits.slice(1)}`;
  if (digits.length >= 9 && digits.length <= 10) return `972${digits}`;
  return digits;
}

export function buildWaMeLink(phone: string, text: string): string {
  const to = toWhatsAppE164Digits(phone);
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}

export type ProspectFunnelStats = {
  total: number;
  byStatus: Record<ProspectStatus, number>;
  contacted: number;
  interested: number;
  pilots: number;
  conversionRate: number;
};

export function emptyFunnelStats(): ProspectFunnelStats {
  return {
    total: 0,
    byStatus: {
      new: 0,
      contacted: 0,
      replied: 0,
      interested: 0,
      not_interested: 0,
      demo_scheduled: 0,
      pilot: 0,
      converted: 0,
      discarded: 0,
    },
    contacted: 0,
    interested: 0,
    pilots: 0,
    conversionRate: 0,
  };
}

export function aggregateProspectFunnel(
  prospects: Prospect[],
): ProspectFunnelStats {
  const stats = emptyFunnelStats();
  stats.total = prospects.length;
  for (const p of prospects) {
    stats.byStatus[p.status] += 1;
  }
  stats.contacted =
    stats.total -
    stats.byStatus.new -
    stats.byStatus.discarded;
  stats.interested =
    stats.byStatus.interested +
    stats.byStatus.demo_scheduled +
    stats.byStatus.pilot +
    stats.byStatus.converted;
  stats.pilots = stats.byStatus.pilot + stats.byStatus.converted;
  const reached = prospects.filter((p) => p.status !== "new" && p.status !== "discarded").length;
  stats.conversionRate =
    reached > 0 ? Math.round((stats.interested / reached) * 100) : 0;
  return stats;
}
