import { AgentDecision } from "@/lib/agent/types";

export type AgentTokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  /** Estimated ILS cost for this turn (model-dependent heuristic). */
  costIls: number;
  model?: string;
};

export type AgentTurnLog = {
  tenantId: string;
  metaMessageId?: string;
  conversationId?: string;
  source: "llm" | "classifier" | "passthrough";
  decision: Pick<
    AgentDecision,
    "intent" | "nextAction" | "confidence" | "language" | "processKey"
  >;
  groundedCount: number;
  usage?: AgentTokenUsage;
  latencyMs?: number;
  error?: string;
};

/** Rough ILS cost from OpenAI-class token counts (gpt-4o-mini ballpark). */
export function estimateTokenCostIls(input: {
  promptTokens: number;
  completionTokens: number;
  model?: string;
}): number {
  // Defaults approximate USD→ILS (~3.7) for gpt-4o-mini input/output.
  const inPerM = 0.55; // ₪ per 1M prompt tokens
  const outPerM = 2.2; // ₪ per 1M completion tokens
  void input.model;
  const cost =
    (input.promptTokens / 1_000_000) * inPerM +
    (input.completionTokens / 1_000_000) * outPerM;
  return Math.round(cost * 10_000) / 10_000;
}

export function logAgentTurn(log: AgentTurnLog): void {
  console.info(
    "[moked:agent:turn]",
    JSON.stringify({
      tenantId: log.tenantId,
      metaMessageId: log.metaMessageId ?? null,
      conversationId: log.conversationId ?? null,
      source: log.source,
      intent: log.decision.intent,
      nextAction: log.decision.nextAction,
      confidence: log.decision.confidence,
      language: log.decision.language,
      processKey: log.decision.processKey ?? null,
      groundedCount: log.groundedCount,
      promptTokens: log.usage?.promptTokens ?? 0,
      completionTokens: log.usage?.completionTokens ?? 0,
      totalTokens: log.usage?.totalTokens ?? 0,
      costIls: log.usage?.costIls ?? 0,
      model: log.usage?.model ?? null,
      latencyMs: log.latencyMs ?? null,
      error: log.error ?? null,
    }),
  );
}
