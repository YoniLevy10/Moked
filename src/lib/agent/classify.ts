import {
  AgentDecision,
  AgentLanguage,
  Intent,
  TenantKnowledgeRow,
} from "@/lib/agent/types";
import {
  findPricedService,
  knowledgeFromTenant,
  retrieveGroundings,
} from "@/lib/agent/knowledge";
import { applyConfidencePolicy, checkingReply } from "@/lib/agent/policy";
import { Conversation, Tenant } from "@/lib/types";

const ARABIC = /[\u0600-\u06FF]/;
const HEBREW = /[\u0590-\u05FF]/;

export function detectLanguage(text: string): AgentLanguage {
  if (ARABIC.test(text)) return "ar";
  if (HEBREW.test(text)) return "he";
  // Latin-heavy → English; default Hebrew for this product
  if (/[a-zA-Z]/.test(text) && !HEBREW.test(text) && !ARABIC.test(text)) {
    return "en";
  }
  return "he";
}

type ClassifyInput = {
  text: string;
  tenant: Tenant;
  conversation?: Conversation;
  extraKnowledge?: TenantKnowledgeRow[];
};

function scoreIntent(text: string): { intent: Intent; confidence: number } {
  const t = text.trim();

  if (
    /(?:^|\s)(הפסק|תפסיק|stop|unsubscribe|לא ליצור קשר|opt\s*out)/i.test(t)
  ) {
    return { intent: "opt_out", confidence: 0.95 };
  }
  if (
    /אדם|נציג|אנושי|מנהל|human|person|agent|تحدث مع|إنسان|speak (to|with) (a )?human|real person/i.test(
      t,
    )
  ) {
    return { intent: "human_request", confidence: 0.92 };
  }
  if (
    /זוע[םמ]|כועס|תלונה|חרטה|לא מרוצה|גרוע|terrible|angry|complaint|احتيال|شكوى|scam/i.test(
      t,
    )
  ) {
    return { intent: "complaint", confidence: 0.9 };
  }
  if (
    /הנחה|זול יותר|תוריד מחיר|discount|cheaper|عرض خاص|تخفيض/i.test(t)
  ) {
    // Discount fishing → treat as price_question with escalate via policy/no approval
    return { intent: "price_question", confidence: 0.7 };
  }
  if (
    /כמה|מחיר|תמחור|עלות|price|cost|how much|بكم|سعر|تكلفة/i.test(t)
  ) {
    return { intent: "price_question", confidence: 0.88 };
  }
  if (
    /שעות|מתי אתם|פתוח|סגור|hours|open|בימי|ساعات العمل/i.test(t)
  ) {
    return { intent: "hours", confidence: 0.86 };
  }
  if (
    /אזור|מגיעים ל|שירות באזור|service area|area|منطقة|تغطون/i.test(t)
  ) {
    return { intent: "service_area", confidence: 0.84 };
  }
  if (
    /לבטל|ביטול|cancel|إلغاء/i.test(t)
  ) {
    return { intent: "cancel", confidence: 0.85 };
  }
  if (
    /לשנות מועד|דחייה|reschedule|تأجيل|تغيير الموعد/i.test(t)
  ) {
    return { intent: "reschedule", confidence: 0.85 };
  }
  if (
    /פנוי|זמין|זמינות|available|מחר ב|בשעה|יום ראשון|sometime|next week|غدا|متاح|אחרי הצהריים/i.test(
      t,
    )
  ) {
    return { intent: "availability", confidence: 0.8 };
  }
  if (
    /לקבוע|קבעו|תור|ביקור|קביעת|מועד|book|schedule|موعد|حجز/i.test(t)
  ) {
    return { intent: "book", confidence: 0.86 };
  }
  if (
    /מה כולל|שירות|מה אתם עושים|service|ماذا تقدمون|خدمات/i.test(t)
  ) {
    return { intent: "service_info", confidence: 0.78 };
  }
  if (
    /אתה בוט|בוט\?|are you (a )?bot|روبوت/i.test(t)
  ) {
    return { intent: "smalltalk", confidence: 0.9 };
  }
  if (
    /שלום|היי|hello|hi|בוקר טוב|ערב טוב|مرحبا|السلام/i.test(t) &&
    t.length < 40
  ) {
    return { intent: "smalltalk", confidence: 0.82 };
  }
  // Unrelated / gibberish
  if (
    /ביטקוין|crypto|lottery|השקעות פורקס|نصائح طبية|lawsuit/i.test(t)
  ) {
    return { intent: "unknown", confidence: 0.35 };
  }

  return { intent: "unknown", confidence: 0.35 };
}

function botDisclosure(tenant: Tenant, language: AgentLanguage): string {
  const owner = tenant.ownerName || "בעל העסק";
  if (language === "ar") {
    return `نعم، أنا المساعد الرقمي لـ ${tenant.businessName}. يمكنك التحدث مع ${owner} متى شئت.`;
  }
  if (language === "en") {
    return `Yes, I am the digital assistant of ${tenant.businessName}. You can talk to ${owner} whenever you want.`;
  }
  return `כן, אני העוזר הדיגיטלי של ${tenant.businessName}. אפשר לדבר עם ${owner} מתי שתרצה.`;
}

/**
 * Deterministic classifier + grounded reply sketch.
 * LLM is optional; eval and demo FAQ path use this.
 */
export function classifyMessage(input: ClassifyInput): AgentDecision {
  const text = input.text.trim();
  const language = detectLanguage(text);
  const { intent, confidence } = scoreIntent(text);
  const agentState = (input.conversation as { agent?: { clarifyCount?: number; turnCount?: number } } | undefined)
    ?.agent;
  const clarifyCount = agentState?.clarifyCount ?? 0;
  const turnCount = agentState?.turnCount ?? 0;

  const seeded = [
    ...knowledgeFromTenant(input.tenant),
    ...(input.extraKnowledge ?? []),
  ];

  let decision: AgentDecision = {
    intent,
    language,
    confidence,
    slots: {},
    groundings: [],
    nextAction: "reply",
  };

  if (intent === "opt_out") {
    decision = {
      ...decision,
      nextAction: "opt_out",
      confidence: 0.95,
      reply:
        language === "en"
          ? "Understood — I will not message you again."
          : language === "ar"
            ? "حسناً، لن أراسلك مجدداً."
            : "הבנתי — לא אצור איתך קשר שוב.",
    };
    return applyConfidencePolicy(decision, { clarifyCount, turnCount });
  }

  if (intent === "human_request" || intent === "complaint") {
    decision = {
      ...decision,
      nextAction: "escalate",
      reply:
        language === "en"
          ? "I am connecting you with the owner now."
          : language === "ar"
            ? "أحوّلك الآن إلى صاحب العمل."
            : "מחבר אותך עכשיו לבעל העסק.",
    };
    return applyConfidencePolicy(decision, { clarifyCount, turnCount });
  }

  if (intent === "price_question") {
    const priced = findPricedService(text, input.tenant);
    const discountAsk = /הנחה|discount|تخفيض|cheaper|זול יותר/i.test(text);
    if (discountAsk) {
      decision = {
        ...decision,
        nextAction: "escalate",
        confidence: 0.9,
        groundings: priced ? [priced.grounding] : [],
        reply:
          language === "en"
            ? "Discount requests need owner approval — I am checking."
            : "בקשות הנחה דורשות אישור בעל העסק — אני בודק.",
      };
      return applyConfidencePolicy(decision, { clarifyCount, turnCount });
    }
    if (priced) {
      decision = {
        ...decision,
        nextAction: "reply",
        confidence: Math.max(confidence, 0.9),
        groundings: [priced.grounding],
        slots: { service: priced.name, priceIls: priced.priceIls },
        reply:
          language === "en"
            ? `${priced.name} is ₪${priced.priceIls}. Want to book a visit?`
            : language === "ar"
              ? `${priced.name} بسعر ₪${priced.priceIls}. هل نحدد زيارة؟`
              : `${priced.name} עולה ₪${priced.priceIls}. לקבוע ביקור?`,
      };
    } else {
      // Unknown service — escalate, never invent a number
      decision = {
        ...decision,
        nextAction: "escalate",
        confidence: 0.4,
        groundings: [],
        reply: checkingReply(language),
      };
    }
    return applyConfidencePolicy(decision, { clarifyCount, turnCount });
  }

  if (intent === "hours") {
    const hours = input.tenant.bot?.answers?.hours?.trim();
    const groundings = hours
      ? [{ source: "bot.answers.hours", text: hours }]
      : retrieveGroundings({ query: text, rows: seeded, kinds: ["hours"] });
    if (groundings.length) {
      decision = {
        ...decision,
        nextAction: "reply",
        groundings,
        reply:
          language === "en"
            ? `Our hours: ${groundings[0].text}. Need anything else?`
            : `שעות הפעילות: ${groundings[0].text}. אפשר לעזור בעוד משהו?`,
      };
    } else {
      decision = {
        ...decision,
        nextAction: "escalate",
        confidence: 0.4,
        reply: checkingReply(language),
      };
    }
    return applyConfidencePolicy(decision, { clarifyCount, turnCount });
  }

  if (intent === "service_area") {
    const areaRows = retrieveGroundings({
      query: text,
      rows: seeded,
      kinds: ["area"],
    });
    const what = input.tenant.bot?.answers?.what?.trim();
    if (areaRows.length) {
      decision = {
        ...decision,
        nextAction: "reply",
        confidence: Math.max(confidence, 0.85),
        groundings: areaRows,
        reply: `אזור השירות: ${areaRows[0].text}. מאיפה אתה?`,
      };
    } else if (what) {
      decision = {
        ...decision,
        nextAction: "reply",
        confidence: 0.55,
        groundings: [{ source: "bot.answers.what", text: what }],
        reply: `אנחנו מגיעים לפי האזור שמפורט אצלנו. תרשום עיר?`,
      };
    } else {
      decision = {
        ...decision,
        nextAction: "escalate",
        confidence: 0.4,
        reply: checkingReply(language),
      };
    }
    return applyConfidencePolicy(decision, { clarifyCount, turnCount });
  }

  if (intent === "service_info") {
    const what = input.tenant.bot?.answers?.what?.trim();
    const groundings = what
      ? [{ source: "bot.answers.what", text: what }]
      : retrieveGroundings({
          query: text,
          rows: seeded,
          kinds: ["service", "faq"],
        });
    if (groundings.length) {
      decision = {
        ...decision,
        nextAction: "reply",
        groundings,
        reply: `${groundings[0].text}\nבמה בדיוק אפשר לעזור?`,
      };
    } else {
      decision = {
        ...decision,
        nextAction: "escalate",
        confidence: 0.4,
        reply: checkingReply(language),
      };
    }
    return applyConfidencePolicy(decision, { clarifyCount, turnCount });
  }

  if (intent === "book" || intent === "availability") {
    decision = {
      ...decision,
      nextAction: "route_process",
      processKey: "booking",
      confidence: Math.max(confidence, 0.8),
      slots: /מחר/.test(text)
        ? { when: "tomorrow" }
        : /שבוע הבא|next week/.test(text)
          ? { when: "next_week" }
          : {},
    };
    return applyConfidencePolicy(decision, { clarifyCount, turnCount });
  }

  if (intent === "cancel" || intent === "reschedule") {
    decision = {
      ...decision,
      nextAction: "route_process",
      processKey: "booking",
      slots: { action: intent },
    };
    return applyConfidencePolicy(decision, { clarifyCount, turnCount });
  }

  if (intent === "smalltalk") {
    if (/בוט|bot|روبوت/i.test(text)) {
      decision = {
        ...decision,
        nextAction: "reply",
        reply: botDisclosure(input.tenant, language),
      };
    } else {
      decision = {
        ...decision,
        nextAction: "route_process",
        processKey: "intake",
        confidence: Math.max(confidence, 0.8),
      };
    }
    return applyConfidencePolicy(decision, { clarifyCount, turnCount });
  }

  // unknown / unrelated
  decision = {
    ...decision,
    nextAction: confidence < 0.45 ? "escalate" : "clarify",
    reply:
      confidence < 0.45
        ? language === "en"
          ? "I mostly help with visits and quotes for this business. Want to book?"
          : "אני בעיקר עוזר לקבוע ביקור או הצעת מחיר כאן. רוצה לקבוע?"
        : language === "en"
          ? "Did you mean a visit booking, or a price question?"
          : "התכוונת לקביעת ביקור, או לשאלת מחיר?",
  };
  return applyConfidencePolicy(decision, { clarifyCount, turnCount });
}
