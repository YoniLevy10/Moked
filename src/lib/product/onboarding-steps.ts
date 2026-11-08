/** Canonical P1 self-service onboarding steps (plan §4). */
export const ONBOARDING_STEPS = [
  { id: 1, key: "register", labelHe: "הרשמה" },
  { id: 2, key: "vertical", labelHe: "בחירת תחום" },
  { id: 3, key: "business", labelHe: "עסק · שירותים · מחירים · שעות" },
  { id: 4, key: "policy", labelHe: "מדיניות סוכן" },
  { id: 5, key: "escalation", labelHe: "כללי הסלמה" },
  { id: 6, key: "whatsapp", labelHe: "חיבור WhatsApp" },
  { id: 7, key: "simulator", labelHe: "סימולטור" },
  { id: 8, key: "readiness", labelHe: "מוכנות" },
  { id: 9, key: "golive", labelHe: "עלייה לאוויר" },
  { id: 10, key: "reedit", labelHe: "עריכה חוזרת" },
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]["id"];

/** UI catalog — trades + appointments (beauty|coach; no medical clinics). */
export const ONBOARDING_VERTICALS = [
  {
    id: "trades" as const,
    labelHe: "בעלי מקצוע",
    hintHe: "זמין עכשיו — ברירות מחדל מ־Vertical Pack",
    selectable: true,
  },
  {
    id: "appointments" as const,
    labelHe: "תורים / פגישות",
    hintHe: "יופי · אימון — בלי קליניקות רפואיות",
    selectable: true,
  },
] as const;

export const TRADE_KIND_OPTIONS = [
  { id: "plumbing", labelHe: "אינסטלציה" },
  { id: "electrical", labelHe: "חשמל" },
  { id: "hvac", labelHe: "מיזוג" },
  { id: "renovation", labelHe: "שיפוצים" },
  { id: "handyman", labelHe: "הנדימן" },
] as const;

/** Maps UI appointments niche → Tenant.vertical beauty|coach. */
export const APPOINTMENT_KIND_OPTIONS = [
  { id: "beauty", labelHe: "יופי / טיפוח" },
  { id: "coach", labelHe: "אימון / ייעוץ" },
] as const;

export function inferOnboardingStep(input: {
  hasTenant: boolean;
  botApproved: boolean;
  whatsappConnected: boolean;
  ready: boolean;
  wentLive?: boolean;
}): OnboardingStepId {
  if (!input.hasTenant) return 1;
  if (!input.botApproved) return 4;
  if (!input.whatsappConnected) return 6;
  if (!input.ready) return 8;
  if (!input.wentLive) return 9;
  return 10;
}
