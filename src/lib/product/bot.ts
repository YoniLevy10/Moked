import { Tenant } from "@/lib/types";
import { currentPeriod } from "@/lib/product/model";

export type ModelDecision = {
  reply: string;
  lead: boolean;
  booking: boolean;
};

function wantsBooking(text: string): boolean {
  return /תור|לקבוע|קביעת|מחר|היום|שעה/.test(text);
}

function block(title: string, body: string | undefined): string | null {
  const text = body?.trim();
  if (!text) return null;
  return `## ${title}\n${text}`;
}

/** System prompt the owner reviews and approves for the WhatsApp bot. */
export function compileInstructions(tenant: Tenant): string {
  const answers = tenant.bot.answers;
  const facts = [
    answers.what && `מה העסק עושה: ${answers.what}`,
    answers.hours && `שעות פעילות: ${answers.hours}`,
    answers.forbidden && `אסור: ${answers.forbidden}`,
    answers.handoff && `מתי להעביר לאדם: ${answers.handoff}`,
    answers.pasted && answers.pasted.trim(),
  ]
    .filter(Boolean)
    .join("\n");

  return [
    `# הנחיית מערכת — מזכיר הוואטסאפ של ${tenant.businessName}`,
    "",
    "## תפקיד",
    `אתה המזכיר הדיגיטלי של ${tenant.businessName}. אתה עונה ללקוחות בוואטסאפ בעברית, בגוף ראשון, בקצרה, ובטון של מזכירות מקצועית.`,
    block("עובדות העסק", facts),
    [
      "## כללי מענה",
      "- ענה רק לפי העובדות שכתובות כאן. אל תמציא מחיר, זמן תיקון, אחריות או הבטחה.",
      "- בכל הודעה שאל שאלה אחת חסרה: מה התקלה, דגם המכשיר, מתי נוח, או כתובת.",
      "- בקשת תור: הצע מועד ובקש בחירה. אל תאשר שעה שהלקוח לא בחר.",
      "- בקשה שחורגת מההנחיות, או מחיר שלא רשום: אמור שבעל העסק יחזור עם תשובה.",
      "- סיים כל הודעה בצעד הבא הברור ללקוח.",
    ].join("\n"),
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n\n");
}

export function hasLlmKey(): boolean {
  return Boolean(process.env.MOKED_LLM_API_KEY || process.env.OPENAI_API_KEY);
}

export async function rewriteInstructions(tenant: Tenant): Promise<string> {
  const compiled = compileInstructions(tenant);
  if (!hasLlmKey()) return compiled;
  const key = process.env.MOKED_LLM_API_KEY || process.env.OPENAI_API_KEY;
  const model = process.env.MOKED_LLM_MODEL || "gpt-4o-mini";
  const base = process.env.MOKED_LLM_BASE_URL || "https://api.openai.com/v1";
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "הפוך את הטקסט להנחיית מערכת מקצועית למזכיר וואטסאפ. שמור על המבנה: תפקיד, עובדות העסק, כללי מענה. אל תוסיף מחירים או הבטחות שלא נכתבו. החזר רק את ההנחיה.",
        },
        { role: "user", content: compiled },
      ],
    }),
  });
  if (!res.ok) return compiled;
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content?.trim() || compiled;
}

function localDecision(tenant: Tenant, text: string): ModelDecision {
  const booking = wantsBooking(text);
  return {
    reply: [
      `שלום, כאן ${tenant.businessName}.`,
      booking ? "קבעתי את הפנייה ונחזור לאישור השעה." : "קיבלתי את הפנייה.",
    ].join("\n"),
    lead: true,
    booking,
  };
}

export async function replyFromInstructions(
  tenant: Tenant,
  text: string,
): Promise<ModelDecision> {
  const approved = tenant.bot.approved;
  if (!approved) return localDecision(tenant, text);
  if (!hasLlmKey()) return localDecision(tenant, text);
  const key = process.env.MOKED_LLM_API_KEY || process.env.OPENAI_API_KEY;
  const model = process.env.MOKED_LLM_MODEL || "gpt-4o-mini";
  const base = process.env.MOKED_LLM_BASE_URL || "https://api.openai.com/v1";
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `${approved}\nהחזר JSON בלבד: {"reply":"...","lead":true,"booking":false}`,
        },
        { role: "user", content: text },
      ],
    }),
  });
  if (!res.ok) return localDecision(tenant, text);
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  try {
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "") as ModelDecision;
    if (!parsed.reply) return localDecision(tenant, text);
    return {
      reply: parsed.reply,
      lead: Boolean(parsed.lead),
      booking: Boolean(parsed.booking),
    };
  } catch {
    return localDecision(tenant, text);
  }
}

export function outboundPeriod(tenant: Tenant): { count: number; cap: number; blocked: boolean } {
  const period = currentPeriod();
  const count =
    tenant.subscription.outboundPeriod === period ? tenant.subscription.outboundCount : 0;
  const cap = tenant.subscription.monthlyOutboundCap || 1000;
  return { count, cap, blocked: count >= cap };
}
