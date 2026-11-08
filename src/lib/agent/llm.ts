import { applyConfidencePolicy, checkingReply } from "@/lib/agent/policy";
import { buildAgentPrompt } from "@/lib/agent/prompt";
import {
  AgentDecision,
  AgentDecisionSchema,
  AgentLanguage,
  ConversationAgentState,
  TenantKnowledgeRow,
} from "@/lib/agent/types";
import {
  AGENT_TOOL_DEFINITIONS,
  executeAgentTool,
  type AgentToolContext,
} from "@/lib/agent/tools";
import {
  estimateTokenCostIls,
  type AgentTokenUsage,
} from "@/lib/agent/observability";
import type { Grounding } from "@/lib/agent/knowledge";
import { Conversation, Tenant } from "@/lib/types";

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
};

function llmConfig() {
  const key =
    process.env.MOKED_LLM_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    "";
  const model = process.env.MOKED_LLM_MODEL?.trim() || "gpt-4o-mini";
  const base =
    process.env.MOKED_LLM_BASE_URL?.trim() || "https://api.openai.com/v1";
  return { key, model, base };
}

function catalogPriceSet(tenant: Tenant): Set<number> {
  return new Set(
    (tenant.pricing ?? [])
      .map((p) => p.priceIls)
      .filter((n) => Number.isFinite(n)),
  );
}

/** Fail-closed: strip or reject replies that invent non-catalog ₪ amounts. */
export function enforceNoInventedPrices(
  decision: AgentDecision,
  tenant: Tenant,
): AgentDecision {
  const allowed = catalogPriceSet(tenant);
  const groundedAmounts = new Set<number>();
  for (const g of decision.groundings) {
    for (const m of g.text.matchAll(/₪\s*(\d+(?:[.,]\d+)?)/g)) {
      groundedAmounts.add(Number(String(m[1]).replace(",", "")));
    }
    const metaPrice = (g as Grounding & { priceIls?: number }).priceIls;
    if (typeof metaPrice === "number") groundedAmounts.add(metaPrice);
  }
  for (const n of groundedAmounts) allowed.add(n);

  const reply = decision.reply ?? "";
  const amounts = [
    ...reply.matchAll(/₪\s*(\d+(?:[.,]\d+)?)/g),
  ].map((m) => Number(String(m[1]).replace(",", "")));

  const invented = amounts.some((n) => Number.isFinite(n) && !allowed.has(n));
  if (!invented) return decision;

  return {
    ...decision,
    nextAction: "escalate",
    groundings: decision.groundings,
    reply: checkingReply(decision.language),
    confidence: Math.min(decision.confidence, 0.4),
  };
}

function parseDecisionJson(
  raw: string,
  language: AgentLanguage,
): AgentDecision | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = AgentDecisionSchema.safeParse(parsed);
    if (result.success) return result.data;
  } catch {
    /* retry path handles */
  }
  // Soft extract JSON object
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const result = AgentDecisionSchema.safeParse(
        JSON.parse(raw.slice(start, end + 1)),
      );
      if (result.success) return result.data;
    } catch {
      /* fall through */
    }
  }
  void language;
  return null;
}

async function chatCompletions(input: {
  messages: ChatMessage[];
  tools?: typeof AGENT_TOOL_DEFINITIONS;
  toolChoice?: "auto" | "none";
  temperature?: number;
}): Promise<{
  message: ChatMessage;
  usage: AgentTokenUsage;
} | null> {
  const { key, model, base } = llmConfig();
  if (!key) return null;
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: input.temperature ?? 0,
      // JSON mode only on the final decision turn — tool rounds need free tool_calls.
      ...(input.toolChoice === "none" || !input.tools
        ? { response_format: { type: "json_object" } }
        : {}),
      messages: input.messages,
      ...(input.tools
        ? {
            tools: input.tools,
            tool_choice: input.toolChoice ?? "auto",
          }
        : {}),
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    choices?: Array<{ message?: ChatMessage }>;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  };
  const message = data.choices?.[0]?.message;
  if (!message) return null;
  const promptTokens = data.usage?.prompt_tokens ?? 0;
  const completionTokens = data.usage?.completion_tokens ?? 0;
  const usage: AgentTokenUsage = {
    promptTokens,
    completionTokens,
    totalTokens: data.usage?.total_tokens ?? promptTokens + completionTokens,
    costIls: estimateTokenCostIls({ promptTokens, completionTokens, model }),
    model,
  };
  return { message, usage };
}

function mergeUsage(a: AgentTokenUsage, b: AgentTokenUsage): AgentTokenUsage {
  const promptTokens = a.promptTokens + b.promptTokens;
  const completionTokens = a.completionTokens + b.completionTokens;
  return {
    promptTokens,
    completionTokens,
    totalTokens: a.totalTokens + b.totalTokens,
    costIls:
      Math.round(
        (a.costIls + b.costIls) * 10_000,
      ) / 10_000,
    model: b.model ?? a.model,
  };
}

/**
 * Real LLM path: structured JSON decision + tools for price/slots/process.
 * Returns null on any hard failure so caller can fall back to classifier.
 */
export async function runLlmAgentDecision(input: {
  tenant: Tenant;
  conversation: Conversation;
  inboundText: string;
  knowledge: TenantKnowledgeRow[];
  agentState?: ConversationAgentState;
  languageHint?: AgentLanguage;
}): Promise<{ decision: AgentDecision; usage: AgentTokenUsage } | null> {
  const language = input.languageHint ?? input.agentState?.language ?? "he";
  const system = [
    buildAgentPrompt({
      tenant: input.tenant,
      groundings: [],
      activeProcess: input.conversation.activeProcess,
      stage: input.agentState?.stage,
      askedSlots: input.agentState?.askedSlots,
      forbidden: input.tenant.bot?.answers?.forbidden,
      omitCatalogPrices: true,
    }),
    "",
    "You MUST use tools for any price (lookup_price) or availability (propose_slots).",
    "Never invent a ₪ amount. If lookup_price finds nothing, escalate.",
    "Return a single JSON object matching the AgentDecision schema.",
    "Fields: intent, language, confidence, slots, groundings, nextAction, processKey?, reply?.",
    "Copy grounding source/text from tool results into groundings when answering prices.",
  ].join("\n");

  const messages: ChatMessage[] = [
    { role: "system", content: system },
    { role: "user", content: input.inboundText },
  ];

  const toolCtx: AgentToolContext = {
    tenant: input.tenant,
    conversation: input.conversation,
    language,
    knowledge: input.knowledge,
  };

  let usage: AgentTokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    costIls: 0,
    model: llmConfig().model,
  };
  let collectedGroundings: Grounding[] = [];
  let forcedPatch: Partial<AgentDecision> | undefined;

  const maxRounds = 4;
  for (let round = 0; round < maxRounds; round++) {
    const result = await chatCompletions({
      messages,
      tools: AGENT_TOOL_DEFINITIONS,
      toolChoice: "auto",
      temperature: 0,
    });
    if (!result) return null;
    usage = mergeUsage(usage, result.usage);
    const msg = result.message;

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      messages.push({
        role: "assistant",
        content: msg.content ?? null,
        tool_calls: msg.tool_calls,
      });
      for (const call of msg.tool_calls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function.arguments || "{}") as Record<
            string,
            unknown
          >;
        } catch {
          args = {};
        }
        const toolResult = await executeAgentTool(
          call.function.name,
          args,
          toolCtx,
        );
        collectedGroundings = [
          ...collectedGroundings,
          ...toolResult.groundings,
        ];
        if (toolResult.decisionPatch) {
          forcedPatch = { ...forcedPatch, ...toolResult.decisionPatch };
        }
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(toolResult.data),
        });
      }
      continue;
    }

    const content = msg.content?.trim() ?? "";
    let decision = parseDecisionJson(content, language);
    if (!decision) {
      // One retry at temperature 0 without tools, JSON only
      const retry = await chatCompletions({
        messages: [
          ...messages,
          {
            role: "user",
            content:
              "Previous output was invalid. Return ONLY valid AgentDecision JSON.",
          },
        ],
        toolChoice: "none",
        temperature: 0,
      });
      if (!retry) return null;
      usage = mergeUsage(usage, retry.usage);
      decision = parseDecisionJson(retry.message.content ?? "", language);
      if (!decision) return null;
    }

    if (collectedGroundings.length > 0) {
      decision = {
        ...decision,
        groundings: [
          ...decision.groundings,
          ...collectedGroundings.filter(
            (g) =>
              !decision!.groundings.some(
                (existing) =>
                  existing.source === g.source && existing.text === g.text,
              ),
          ),
        ],
      };
    }
    if (forcedPatch) {
      decision = { ...decision, ...forcedPatch };
      // Preserve reply from model when escalate/route didn't set one
      if (!decision.reply && forcedPatch.reply) {
        decision.reply = forcedPatch.reply;
      }
    }

    decision = applyConfidencePolicy(decision, {
      clarifyCount: input.agentState?.clarifyCount,
      turnCount: input.agentState?.turnCount,
    });
    decision = enforceNoInventedPrices(decision, input.tenant);
    return { decision, usage };
  }

  // Tool loop exhausted without final JSON → escalate safely
  return {
    decision: applyConfidencePolicy(
      {
        intent: "unknown",
        language,
        confidence: 0.2,
        slots: {},
        groundings: collectedGroundings,
        nextAction: "escalate",
        reply: checkingReply(language),
      },
      {
        clarifyCount: input.agentState?.clarifyCount,
        turnCount: input.agentState?.turnCount,
      },
    ),
    usage,
  };
}
