/**
 * Hebrew UTILITY Message Templates — documented {{1}} placeholders.
 * Seeds only; submission goes through Meta Graph (or demo mock).
 */
export const HEBREW_UTILITY_SEEDS = [
  {
    name: "booking_confirm",
    language: "he",
    category: "UTILITY" as const,
    /** {{1}} = business name, {{2}} = appointment time */
    body: "שלום, התור אצל {{1}} אושר ל־{{2}}. נשמח לראותך!",
    components: [
      {
        type: "BODY",
        text: "שלום, התור אצל {{1}} אושר ל־{{2}}. נשמח לראותך!",
        example: { body_text: [["MOKED", "מחר 10:00"]] },
      },
    ],
  },
  {
    name: "reminder_t24",
    language: "he",
    category: "UTILITY" as const,
    /** {{1}} = business name, {{2}} = appointment time */
    body: "תזכורת מ־{{1}}: מחר יש לך תור ל־{{2}}. השב/י מאשר / לדחות / לבטל.",
    components: [
      {
        type: "BODY",
        text: "תזכורת מ־{{1}}: מחר יש לך תור ל־{{2}}. השב/י מאשר / לדחות / לבטל.",
        example: { body_text: [["MOKED", "מחר 10:00"]] },
      },
    ],
  },
] as const;

export type SeedTemplateName = (typeof HEBREW_UTILITY_SEEDS)[number]["name"];
