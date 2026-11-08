import { classifyMessage } from "@/lib/agent/classify";
import { runLlmAgentDecision } from "@/lib/agent/llm";
import { logAgentTurn } from "@/lib/agent/observability";
import {
  agentDryRun,
  agentEnabled,
  hasLlmKey,
  maxEscalationsPerConversation,
} from "@/lib/agent/policy";
import { mergeAgentState } from "@/lib/agent/prompt";
import {
  AgentDecision,
  AgentTurnResult,
  ConversationAgentState,
} from "@/lib/agent/types";
import { listTenantKnowledge } from "@/lib/agent/knowledge";
import { Conversation, Tenant } from "@/lib/types";
import { OutboundAction } from "@/lib/processes/types";

export type { AgentDecision, AgentTurnResult } from "@/lib/agent/types";
export { classifyMessage } from "@/lib/agent/classify";
export { seedKnowledgeFromTenant } from "@/lib/agent/knowledge";

function readAgentState(conversation: Conversation): ConversationAgentState {
  const raw = (conversation as Conversation & { agent?: ConversationAgentState })
    .agent;
  return raw ?? {};
}

function repliesFromDecision(decision: AgentDecision): OutboundAction[] {
  if (!decision.reply?.trim()) return [];
  return [
    {
      body: decision.reply.trim(),
      type: "text",
      processKey: decision.processKey ?? "intake",
    },
  ];
}

function finalizeTurn(input: {
  decision: AgentDecision;
  prev: ConversationAgentState;
  tenantId: string;
  conversationId?: string;
  metaMessageId?: string;
  source: "llm" | "classifier" | "passthrough";
  usage?: AgentTurnResult["usage"];
  latencyMs?: number;
  handled: boolean;
  replies: OutboundAction[];
  conversationPatch?: Partial<Conversation>;
  events?: string[];
}): AgentTurnResult {
  logAgentTurn({
    tenantId: input.tenantId,
    conversationId: input.conversationId,
    metaMessageId: input.metaMessageId,
    source: input.source,
    decision: {
      intent: input.decision.intent,
      nextAction: input.decision.nextAction,
      confidence: input.decision.confidence,
      language: input.decision.language,
      processKey: input.decision.processKey,
    },
    groundedCount: input.decision.groundings.length,
    usage: input.usage,
    latencyMs: input.latencyMs,
  });
  return {
    decision: input.decision,
    handled: input.handled,
    replies: input.replies,
    conversationPatch: input.conversationPatch,
    events: input.events,
    usage: input.usage,
    source: input.source,
  };
}

/**
 * Single agent entry point. Wired in engine before runActiveProcess.
 *
 * With LLM key: structured model + tools (lookup_price, propose_slots, …).
 * Without key / LLM failure: deterministic classifier (demo, zero cost).
 * Prices/availability never invented — tools / pricing_items / availability only.
 */
export async function runAgentTurn(input: {
  tenant: Tenant;
  conversation: Conversation;
  inboundText: string;
  metaMessageId?: string;
}): Promise<AgentTurnResult> {
  const started = Date.now();
  if (!agentEnabled()) {
    return finalizeTurn({
      decision: {
        intent: "unknown",
        language: "he",
        confidence: 0,
        slots: {},
        groundings: [],
        nextAction: "reply",
      },
      prev: {},
      tenantId: input.tenant.id,
      conversationId: input.conversation.id,
      metaMessageId: input.metaMessageId,
      source: "passthrough",
      handled: false,
      replies: [],
      latencyMs: Date.now() - started,
    });
  }

  const prev = readAgentState(input.conversation);
  if (prev.optedOut) {
    return finalizeTurn({
      decision: {
        intent: "opt_out",
        language: prev.language ?? "he",
        confidence: 1,
        slots: {},
        groundings: [],
        nextAction: "opt_out",
      },
      prev,
      tenantId: input.tenant.id,
      conversationId: input.conversation.id,
      metaMessageId: input.metaMessageId,
      source: "passthrough",
      handled: true,
      replies: [],
      latencyMs: Date.now() - started,
    });
  }

  if (input.conversation.status === "human_takeover") {
    return finalizeTurn({
      decision: {
        intent: "human_request",
        language: prev.language ?? "he",
        confidence: 1,
        slots: {},
        groundings: [],
        nextAction: "escalate",
      },
      prev,
      tenantId: input.tenant.id,
      conversationId: input.conversation.id,
      metaMessageId: input.metaMessageId,
      source: "passthrough",
      handled: true,
      replies: [],
      events: ["human.takeover.active"],
      latencyMs: Date.now() - started,
    });
  }

  // Active process continues → pass through to deterministic engine (D.4)
  if (input.conversation.activeProcess) {
    return finalizeTurn({
      decision: {
        intent: "unknown",
        language: prev.language ?? "he",
        confidence: 0,
        slots: {},
        groundings: [],
        nextAction: "route_process",
        processKey: input.conversation.activeProcess,
      },
      prev,
      tenantId: input.tenant.id,
      conversationId: input.conversation.id,
      metaMessageId: input.metaMessageId,
      source: "passthrough",
      handled: false,
      replies: [],
      latencyMs: Date.now() - started,
    });
  }

  const extra = await listTenantKnowledge(input.tenant.id).catch(() => []);

  let decision: AgentDecision;
  let source: "llm" | "classifier" = "classifier";
  let usage: AgentTurnResult["usage"];

  if (hasLlmKey()) {
    try {
      const llm = await runLlmAgentDecision({
        tenant: input.tenant,
        conversation: input.conversation,
        inboundText: input.inboundText,
        knowledge: extra,
        agentState: prev,
        languageHint: prev.language,
      });
      if (llm) {
        decision = llm.decision;
        source = "llm";
        usage = llm.usage;
      } else {
        decision = classifyMessage({
          text: input.inboundText,
          tenant: input.tenant,
          conversation: {
            ...input.conversation,
            ...({ agent: prev } as object),
          } as Conversation,
          extraKnowledge: extra,
        });
      }
    } catch (err) {
      logAgentTurn({
        tenantId: input.tenant.id,
        conversationId: input.conversation.id,
        metaMessageId: input.metaMessageId,
        source: "llm",
        decision: {
          intent: "unknown",
          nextAction: "escalate",
          confidence: 0,
          language: prev.language ?? "he",
        },
        groundedCount: 0,
        error: err instanceof Error ? err.message : "llm_error",
        latencyMs: Date.now() - started,
      });
      decision = classifyMessage({
        text: input.inboundText,
        tenant: input.tenant,
        conversation: {
          ...input.conversation,
          ...({ agent: prev } as object),
        } as Conversation,
        extraKnowledge: extra,
      });
    }
  } else {
    decision = classifyMessage({
      text: input.inboundText,
      tenant: input.tenant,
      conversation: {
        ...input.conversation,
        ...({ agent: prev } as object),
      } as Conversation,
      extraKnowledge: extra,
    });
  }

  const latencyMs = Date.now() - started;

  if (decision.nextAction === "route_process") {
    return finalizeTurn({
      decision,
      prev,
      tenantId: input.tenant.id,
      conversationId: input.conversation.id,
      metaMessageId: input.metaMessageId,
      source,
      usage,
      latencyMs,
      handled: false,
      replies: [],
      conversationPatch: {
        agent: mergeAgentState(prev, {
          intent: decision.intent,
          confidence: decision.confidence,
          language: decision.language,
          nextAction: decision.nextAction,
          grounded: decision.groundings.length > 0,
        }),
      } as Partial<Conversation>,
    });
  }

  const escalations = prev.escalations ?? 0;
  if (
    decision.nextAction === "escalate" &&
    escalations >= maxEscalationsPerConversation()
  ) {
    const capped = {
      ...decision,
      reply:
        decision.reply ??
        "בעל העסק כבר קיבל את הפנייה ויחזור אליך.",
    };
    return finalizeTurn({
      decision: capped,
      prev,
      tenantId: input.tenant.id,
      conversationId: input.conversation.id,
      metaMessageId: input.metaMessageId,
      source,
      usage,
      latencyMs,
      handled: true,
      replies: agentDryRun() ? [] : repliesFromDecision(capped),
      conversationPatch: {
        agent: mergeAgentState(prev, {
          intent: decision.intent,
          confidence: decision.confidence,
          language: decision.language,
          nextAction: "escalate",
          grounded: false,
        }),
      } as Partial<Conversation>,
      events: ["human.decision_needed"],
    });
  }

  const agentPatch = mergeAgentState(prev, {
    intent: decision.intent,
    confidence: decision.confidence,
    language: decision.language,
    nextAction: decision.nextAction,
    grounded: decision.groundings.length > 0,
  });

  if (decision.nextAction === "opt_out") {
    return finalizeTurn({
      decision,
      prev,
      tenantId: input.tenant.id,
      conversationId: input.conversation.id,
      metaMessageId: input.metaMessageId,
      source,
      usage,
      latencyMs,
      handled: true,
      replies: agentDryRun() ? [] : repliesFromDecision(decision),
      conversationPatch: {
        status: "closed",
        agent: { ...agentPatch, optedOut: true },
      } as Partial<Conversation>,
      events: ["agent.opt_out"],
    });
  }

  if (decision.nextAction === "escalate") {
    return finalizeTurn({
      decision,
      prev,
      tenantId: input.tenant.id,
      conversationId: input.conversation.id,
      metaMessageId: input.metaMessageId,
      source,
      usage,
      latencyMs,
      handled: true,
      replies: agentDryRun() ? [] : repliesFromDecision(decision),
      conversationPatch: {
        status: "human_takeover",
        agent: agentPatch,
      } as Partial<Conversation>,
      events: ["human.decision_needed", "human.takeover.active"],
    });
  }

  if (decision.nextAction === "reply" || decision.nextAction === "clarify") {
    return finalizeTurn({
      decision,
      prev,
      tenantId: input.tenant.id,
      conversationId: input.conversation.id,
      metaMessageId: input.metaMessageId,
      source,
      usage,
      latencyMs,
      handled: Boolean(decision.reply?.trim()),
      replies: agentDryRun() ? [] : repliesFromDecision(decision),
      conversationPatch: {
        agent: agentPatch,
      } as Partial<Conversation>,
      events: decision.groundings.length
        ? ["agent.grounded_reply"]
        : ["agent.clarify"],
    });
  }

  return finalizeTurn({
    decision,
    prev,
    tenantId: input.tenant.id,
    conversationId: input.conversation.id,
    metaMessageId: input.metaMessageId,
    source,
    usage,
    latencyMs,
    handled: false,
    replies: [],
  });
}
