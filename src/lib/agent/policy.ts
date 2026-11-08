import { AgentDecision, Intent } from "@/lib/agent/types";

export function confidenceReplyThreshold(): number {
  const n = Number(process.env.MOKED_AGENT_CONFIDENCE_REPLY ?? 0.75);
  return Number.isFinite(n) ? n : 0.75;
}

export function confidenceClarifyThreshold(): number {
  const n = Number(process.env.MOKED_AGENT_CONFIDENCE_CLARIFY ?? 0.45);
  return Number.isFinite(n) ? n : 0.45;
}

export function maxAgentTurns(): number {
  const n = Number(process.env.MOKED_AGENT_MAX_TURNS ?? 6);
  return Number.isFinite(n) && n > 0 ? n : 6;
}

export function maxEscalationsPerConversation(): number {
  return 2;
}

export function agentEnabled(): boolean {
  const raw = process.env.MOKED_AGENT_ENABLED;
  if (raw == null || raw === "") return true;
  return !/^(0|false|off|no)$/i.test(raw);
}

export function agentDryRun(): boolean {
  return /^(1|true|yes|on)$/i.test(process.env.MOKED_AGENT_DRY_RUN ?? "");
}

export function hasLlmKey(): boolean {
  return Boolean(
    process.env.MOKED_LLM_API_KEY?.trim() ||
      process.env.OPENAI_API_KEY?.trim(),
  );
}

/** Topics that always escalate (complaints / explicit person request). */
export function mustEscalateIntent(intent: Intent): boolean {
  return intent === "complaint" || intent === "human_request";
}

/**
 * Apply confidence ladder from the agent SoT (C.5).
 * Price/time answers require groundings — otherwise escalate.
 */
export function applyConfidencePolicy(
  decision: AgentDecision,
  opts?: { clarifyCount?: number; turnCount?: number },
): AgentDecision {
  const replyAt = confidenceReplyThreshold();
  const clarifyAt = confidenceClarifyThreshold();
  const clarifyCount = opts?.clarifyCount ?? 0;
  const turnCount = opts?.turnCount ?? 0;

  if (decision.nextAction === "opt_out") {
    return decision;
  }

  if (mustEscalateIntent(decision.intent)) {
    return { ...decision, nextAction: "escalate" };
  }

  // Honor explicit escalate / process routing from the classifier.
  if (
    decision.nextAction === "escalate" ||
    decision.nextAction === "route_process"
  ) {
    return decision;
  }

  if (turnCount >= maxAgentTurns()) {
    return {
      ...decision,
      nextAction: "escalate",
      reply:
        decision.reply ??
        "אני מעביר את זה לבעל העסק שיחזור אליך בהקדם.",
    };
  }

  const needsGrounding =
    decision.intent === "price_question" ||
    decision.intent === "availability" ||
    decision.intent === "hours" ||
    decision.intent === "service_area" ||
    decision.intent === "service_info";

  if (needsGrounding && decision.groundings.length === 0) {
    if (decision.intent === "price_question") {
      return {
        ...decision,
        nextAction: "escalate",
        confidence: Math.min(decision.confidence, clarifyAt - 0.01),
        reply:
          decision.reply ??
          "שאלה טובה, אני בודק ואחזור אליך עם אישור.",
      };
    }
    if (decision.confidence < replyAt) {
      return {
        ...decision,
        nextAction: "escalate",
        reply:
          decision.reply ??
          "שאלה טובה, אני בודק ואחזור אליך עם אישור.",
      };
    }
  }

  if (decision.confidence >= replyAt) {
    if (
      decision.nextAction === "clarify" ||
      decision.nextAction === "unknown" as AgentDecision["nextAction"]
    ) {
      return { ...decision, nextAction: "reply" };
    }
    return decision;
  }

  if (decision.confidence >= clarifyAt) {
    if (clarifyCount >= 1) {
      return {
        ...decision,
        nextAction: "escalate",
        reply:
          decision.reply ??
          "כדי לא לטעות אני מעביר לבעל העסק — הוא יחזור אליך.",
      };
    }
    return {
      ...decision,
      nextAction: "clarify",
      reply:
        decision.reply ??
        "רק לוודא — התכוונת לשירות ספציפי, או לשאלה כללית?",
    };
  }

  return {
    ...decision,
    nextAction: "escalate",
    reply:
      decision.reply ??
      "אני מעביר את זה לבעל העסק שיחזור אליך בהקדם.",
  };
}

export function checkingReply(language: AgentDecision["language"]): string {
  if (language === "ar") return "سؤال جيد، سأتحقق وأعود إليك بالتأكيد.";
  if (language === "en") {
    return "Good question, I am checking and will confirm.";
  }
  return "שאלה טובה, אני בודק ואחזור אליך עם אישור.";
}
