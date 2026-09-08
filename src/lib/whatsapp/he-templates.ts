/** Hebrew utility templates for Meta Business Management API submit. */
export const HE_TEMPLATES = {
  reminder_t24: {
    name: "moked_reminder_t24",
    category: "UTILITY" as const,
    language: "he",
    body: "תזכורת מ-{{1}}: מחר יש לך תור ל-{{2}}. השב מאשר / לדחות / לבטל.",
    buttons: ["מאשר", "לדחות", "לבטל"],
  },
  reminder_t2: {
    name: "moked_reminder_t2",
    category: "UTILITY" as const,
    language: "he",
    body: "תזכורת: בעוד כשעתיים התור שלך ({{2}}) אצל {{1}}. השב מאשר / לדחות / לבטל.",
    buttons: ["מאשר", "לדחות", "לבטל"],
  },
  review_request: {
    name: "moked_review_request",
    category: "UTILITY" as const,
    language: "he",
    body: "תודה שבחרת ב-{{1}}! נשמח לביקורת קצרה: {{2}}",
  },
  booking_confirm: {
    name: "moked_booking_confirm",
    category: "UTILITY" as const,
    language: "he",
    body: "הביקור נקבע ל-{{1}} ב-{{2}}. נשלח תזכורת לפני המועד.",
  },
} as const;

export type HeTemplateKey = keyof typeof HE_TEMPLATES;
