import { z } from "zod";

/** Product waves from the summit plan */
export const ProcessWaveSchema = z.enum(["A", "B", "C", "D"]);
export type ProcessWave = z.infer<typeof ProcessWaveSchema>;

export const ProcessKeySchema = z.enum([
  "intake",
  "qualification",
  "booking",
  "reminders",
  "retention",
  "quote",
  "payment",
]);
export type ProcessKey = z.infer<typeof ProcessKeySchema>;

export const PROCESS_CATALOG: Record<
  ProcessKey,
  {
    key: ProcessKey;
    wave: ProcessWave;
    order: number;
    nameHe: string;
    descriptionHe: string;
    metaOnly: boolean;
    requiresExternal: string[];
  }
> = {
  intake: {
    key: "intake",
    wave: "A",
    order: 1,
    nameHe: "קליטת פנייה",
    descriptionHe: "מענה מיידי + סיווג אוטומטי לכל הודעה נכנסת",
    metaOnly: true,
    requiresExternal: [],
  },
  qualification: {
    key: "qualification",
    wave: "A",
    order: 2,
    nameHe: "סינון ליד",
    descriptionHe: "שאלות קצרות לזיהוי ליד חם מול קר",
    metaOnly: true,
    requiresExternal: [],
  },
  booking: {
    key: "booking",
    wave: "A",
    order: 3,
    nameHe: "תיאום תור",
    descriptionHe: "סגירת מועד בתוך השיחה (יומן אופציונלי)",
    metaOnly: false,
    requiresExternal: ["calendar"],
  },
  reminders: {
    key: "reminders",
    wave: "B",
    order: 4,
    nameHe: "תזכורות ושירות",
    descriptionHe: "תזכורות T-24h / T-2h ואישור הגעה",
    metaOnly: true,
    requiresExternal: ["templates"],
  },
  retention: {
    key: "retention",
    wave: "B",
    order: 5,
    nameHe: "שימור והפניות",
    descriptionHe: "בקשת ביקורת Google והפניות אחרי שירות",
    metaOnly: false,
    requiresExternal: ["google_reviews"],
  },
  quote: {
    key: "quote",
    wave: "C",
    order: 6,
    nameHe: "הצעת מחיר",
    descriptionHe: "הצעה מובנית + מעקב סגירה",
    metaOnly: false,
    requiresExternal: ["pricing"],
  },
  payment: {
    key: "payment",
    wave: "D",
    order: 7,
    nameHe: "גבייה",
    descriptionHe: "לינק תשלום ישראלי + אישור + חשבונית",
    metaOnly: false,
    requiresExternal: ["payments", "invoicing"],
  },
};

export const SubscriptionSchema = z.object({
  status: z
    .enum(["inactive", "pending", "active", "past_due", "canceled"])
    .default("inactive"),
  renewsAt: z.string().optional(),
  provider: z.string().optional(),
  externalId: z.string().optional(),
  invoiceId: z.string().optional(),
  monthlyOutboundCap: z.number().default(1000),
  outboundCount: z.number().default(0),
  outboundPeriod: z.string().optional(),
});
export type Subscription = z.infer<typeof SubscriptionSchema>;

export const BotAnswersSchema = z.object({
  what: z.string().default(""),
  hours: z.string().default(""),
  forbidden: z.string().default(""),
  handoff: z.string().default(""),
  pasted: z.string().default(""),
});
export type BotAnswers = z.infer<typeof BotAnswersSchema>;

export const BotInstructionsSchema = z.object({
  draft: z.string().default(""),
  answers: BotAnswersSchema.default({
    what: "",
    hours: "",
    forbidden: "",
    handoff: "",
    pasted: "",
  }),
  approved: z.string().optional(),
  approvedAt: z.string().optional(),
});
export type BotInstructions = z.infer<typeof BotInstructionsSchema>;

export const PhoneNumberStatusSchema = z.enum([
  "available",
  "reserved",
  "awaiting_code",
  "registering",
  "pending_name",
  "live",
  "suspended",
  "cooldown",
  "banned",
]);
export type PhoneNumberStatus = z.infer<typeof PhoneNumberStatusSchema>;

export const PhoneNumberSchema = z.object({
  id: z.string(),
  e164: z.string(),
  national: z.string(),
  kind: z.enum(["live", "demo"]).default("live"),
  status: PhoneNumberStatusSchema,
  tenantId: z.string().optional(),
  phoneNumberId: z.string().optional(),
  displayName: z.string().optional(),
  pinCipher: z.string().optional(),
  lastError: z.string().optional(),
  lastCode: z.string().optional(),
  cooldownUntil: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PhoneNumber = z.infer<typeof PhoneNumberSchema>;

export const TenantSchema = z.object({
  id: z.string(),
  businessName: z.string(),
  ownerName: z.string(),
  phone: z.string(),
  vertical: z.enum([
    "clinic",
    "trades",
    "coach",
    "beauty",
    "realty",
    "other",
  ]),
  locale: z.literal("he-IL").default("he-IL"),
  createdAt: z.string(),
  whatsapp: z
    .object({
      connected: z.boolean(),
      wabaId: z.string().optional(),
      phoneNumberId: z.string().optional(),
      displayPhone: z.string().optional(),
      /** Per-tenant Meta business token (live mode). Prefer over global env token. */
      accessToken: z.string().optional(),
      connectedAt: z.string().optional(),
      mode: z.enum(["demo", "live"]).default("demo"),
    })
    .default({ connected: false, mode: "demo" }),
  processes: z.record(
    ProcessKeySchema,
    z.object({
      enabled: z.boolean(),
      config: z.record(z.string(), z.unknown()).default({}),
    }),
  ),
  integrations: z
    .object({
      googleCalendar: z.boolean().default(false),
      paymentsProvider: z
        .enum(["none", "demo", "grow", "payplus", "tranzila", "cardcom"])
        .default("none"),
      invoicingProvider: z
        .enum(["none", "icount", "morning", "greeninvoice"])
        .default("none"),
      googleReviewsUrl: z.string().optional(),
    })
    .default({
      googleCalendar: false,
      paymentsProvider: "none",
      invoicingProvider: "none",
    }),
  pricing: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        priceIls: z.number(),
        description: z.string().optional(),
      }),
    )
    .default([]),
  subscription: SubscriptionSchema.default({
    status: "inactive",
    monthlyOutboundCap: 1000,
    outboundCount: 0,
  }),
  bot: BotInstructionsSchema.default({
    draft: "",
    answers: {
      what: "",
      hours: "",
      forbidden: "",
      handoff: "",
      pasted: "",
    },
  }),
});

export type Tenant = z.infer<typeof TenantSchema>;

export const ConversationSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  customerWaId: z.string(), // external channel identity (WhatsApp phone today; rename-safe)
  customerName: z.string().optional(),
  status: z.enum(["open", "human_takeover", "closed"]).default("open"),
  leadScore: z.number().optional(),
  intent: z
    .enum(["sales", "support", "spam", "unknown"])
    .default("unknown"),
  activeProcess: ProcessKeySchema.optional(),
  processState: z.record(z.string(), z.unknown()).default({}),
  booking: z
    .object({
      proposedSlots: z.array(z.string()).optional(),
      confirmedAt: z.string().optional(),
      startsAt: z.string().optional(),
      reminder24Sent: z.boolean().optional(),
      reminder2Sent: z.boolean().optional(),
      attended: z.boolean().optional(),
    })
    .optional(),
  quote: z
    .object({
      itemId: z.string().optional(),
      amountIls: z.number().optional(),
      status: z.enum(["draft", "sent", "accepted", "rejected"]).optional(),
    })
    .optional(),
  payment: z
    .object({
      linkUrl: z.string().optional(),
      status: z.enum(["none", "link_sent", "paid", "failed"]).optional(),
      provider: z.string().optional(),
    })
    .optional(),
  /** Agent-layer memory (intent, clarify count, escalations, language). */
  agent: z
    .object({
      stage: z.string().optional(),
      lastIntent: z.string().optional(),
      confidence: z.number().optional(),
      language: z.enum(["he", "ar", "en"]).optional(),
      askedSlots: z.array(z.string()).optional(),
      clarifyCount: z.number().optional(),
      pendingQuestion: z.string().optional(),
      escalations: z.number().optional(),
      groundedCount: z.number().optional(),
      optedOut: z.boolean().optional(),
      turnCount: z.number().optional(),
    })
    .default({}),
  escalation: z
    .object({
      reason: z.string(),
      at: z.string(),
      notifiedAt: z.string().optional(),
      resolvedAt: z.string().optional(),
      channel: z.enum(["whatsapp", "email", "log"]).optional(),
      attempts: z.number().default(0),
    })
    .optional(),
  updatedAt: z.string(),
  createdAt: z.string(),
});

export type Conversation = z.infer<typeof ConversationSchema>;

export const MessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  tenantId: z.string(),
  direction: z.enum(["inbound", "outbound"]),
  body: z.string(),
  type: z.enum(["text", "template", "interactive", "system"]).default("text"),
  processKey: ProcessKeySchema.optional(),
  metaMessageId: z.string().optional(),
  deliveredAt: z.string().optional(),
  readAt: z.string().optional(),
  failedAt: z.string().optional(),
  errorCode: z.string().optional(),
  createdAt: z.string(),
});

export type Message = z.infer<typeof MessageSchema>;

/** Thin Meta Message Template row (readiness / template lifecycle). */
export const TemplateSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  language: z.string().default("he"),
  category: z.string().default("UTILITY"),
  components: z.array(z.unknown()).default([]),
  status: z
    .enum(["draft", "pending", "approved", "rejected"])
    .default("pending"),
  metaId: z.string().optional(),
  rejectionReason: z.string().optional(),
  submittedAt: z.string().optional(),
  approvedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type MessageTemplate = z.infer<typeof TemplateSchema>;

export const VERTICALS: Record<
  Tenant["vertical"],
  { labelHe: string; defaultGreeting: string }
> = {
  clinic: {
    labelHe: "קליניקה / טיפול",
    defaultGreeting: "שלום! תודה שפנית אלינו. איך אפשר לעזור?",
  },
  trades: {
    labelHe: "בעלי מקצוע",
    defaultGreeting: "היי! קיבלנו את הפנייה. במה מדובר?",
  },
  coach: {
    labelHe: "ייעוץ / אימון",
    defaultGreeting: "שלום! שמחים שפנית. איזה נושא מעניין אותך?",
  },
  beauty: {
    labelHe: "יופי / טיפוח",
    defaultGreeting: "היי! רוצה לקבוע תור או לשאול על טיפול?",
  },
  realty: {
    labelHe: "נדל״ן",
    defaultGreeting: "שלום! מחפש/ת נכס למכירה, להשכרה, או משהו אחר?",
  },
  other: {
    labelHe: "אחר",
    defaultGreeting: "שלום! תודה שפנית. איך אפשר לעזור?",
  },
};
