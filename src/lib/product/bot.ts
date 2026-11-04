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

export function compileInstructions(tenant: Tenant): string {
  const answers = tenant.bot.answers;
  return [
    `אתה המזכיר הדיגיטלי של ${tenant.businessName}.`,
    answers.what && `מה העסק עושה: ${answers.what}`,
    answers.hours && `שעות פעילות: ${answers.hours}`,
    answers.forbidden && `אסור: ${answers.forbidden}`,
    answers.handoff && `מתי להעביר לאדם: ${answers.handoff}`,
    answers.pasted && `הוראות שהודבקו:\n${answers.pasted}`,
    "ענה בעברית, קצר, ובלי להמציא מחירים או הבטחות שלא כתובות כאן.",
  ]
    .filter(Boolean)
    .join("\n");
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
            "נסח הוראות הפעלה קצרות למזכיר וואטסאפ של עסק ישראלי. החזר רק את נוסח ההוראות.",
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
