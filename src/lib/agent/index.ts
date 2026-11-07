import { classifyMessage } from "@/lib/agent/classify";
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

/**
 * Single agent entry point. Wired in engine before runActiveProcess.
 *
 * Without LLM key: deterministic classifier still answers grounded FAQs
 * (zero cost). Spec D.4 "handled:false when key absent" is interpreted with
 * the beachhead lock that demo must work with no LLM — process continuation
 * and disabled agent still pass through; grounded free replies do not invent prices.
 */
export async function runAgentTurn(input: {
  tenant: Tenant;
  conversation: Conversation;
  inboundText: string;
}): Promise<AgentTurnResult> {
  if (!agentEnabled()) {
    return {
      decision: {
        intent: "unknown",
        language: "he",
        confidence: 0,
        slots: {},
        groundings: [],
        nextAction: "reply",
      },
      handled: false,
      replies: [],
    };
  }

  const prev = readAgentState(input.conversation);
  if (prev.optedOut) {
    return {
      decision: {
        intent: "opt_out",
        language: prev.language ?? "he",
        confidence: 1,
        slots: {},
        groundings: [],
        nextAction: "opt_out",
      },
      handled: true,
      replies: [],
    };
  }

  if (input.conversation.status === "human_takeover") {
    return {
      decision: {
        intent: "human_request",
        language: prev.language ?? "he",
        confidence: 1,
        slots: {},
        groundings: [],
        nextAction: "escalate",
      },
      handled: true,
      replies: [],
      events: ["human.takeover.active"],
    };
  }

  // Active process continues → pass through to deterministic engine (D.4)
  if (input.conversation.activeProcess) {
    return {
      decision: {
        intent: "unknown",
        language: prev.language ?? "he",
        confidence: 0,
        slots: {},
        groundings: [],
        nextAction: "route_process",
        processKey: input.conversation.activeProcess,
      },
      handled: false,
      replies: [],
    };
  }

  const extra = await listTenantKnowledge(input.tenant.id).catch(() => []);
  const decision = classifyMessage({
    text: input.inboundText,
    tenant: input.tenant,
    conversation: {
      ...input.conversation,
      // expose agent state to classifier via cast field
      ...( { agent: prev } as object),
    } as Conversation,
    extraKnowledge: extra,
  });

  // Without LLM, route_process always falls through to the engine
  if (decision.nextAction === "route_process") {
    return {
      decision,
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
    };
  }

  const escalations = prev.escalations ?? 0;
  if (
    decision.nextAction === "escalate" &&
    escalations >= maxEscalationsPerConversation()
  ) {
    return {
      decision: {
        ...decision,
        reply:
          decision.reply ??
          "בעל העסק כבר קיבל את הפנייה ויחזור אליך.",
      },
      handled: true,
      replies: agentDryRun()
        ? []
        : repliesFromDecision({
            ...decision,
            reply:
              decision.reply ??
              "בעל העסק כבר קיבל את הפנייה ויחזור אליך.",
          }),
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
    };
  }

  const agentPatch = mergeAgentState(prev, {
    intent: decision.intent,
    confidence: decision.confidence,
    language: decision.language,
    nextAction: decision.nextAction,
    grounded: decision.groundings.length > 0,
  });

  if (decision.nextAction === "opt_out") {
    return {
      decision,
      handled: true,
      replies: agentDryRun() ? [] : repliesFromDecision(decision),
      conversationPatch: {
        status: "closed",
        agent: { ...agentPatch, optedOut: true },
      } as Partial<Conversation>,
      events: ["agent.opt_out"],
    };
  }

  if (decision.nextAction === "escalate") {
    return {
      decision,
      handled: true,
      replies: agentDryRun() ? [] : repliesFromDecision(decision),
      conversationPatch: {
        status: "human_takeover",
        agent: agentPatch,
      } as Partial<Conversation>,
      events: ["human.decision_needed", "human.takeover.active"],
    };
  }

  if (decision.nextAction === "reply" || decision.nextAction === "clarify") {
    // Deterministic grounded replies work without LLM (beachhead demo lock).
    // LLM path reserved for future enrichment when hasLlmKey().
    void hasLlmKey;
    return {
      decision,
      handled: Boolean(decision.reply?.trim()),
      replies: agentDryRun() ? [] : repliesFromDecision(decision),
      conversationPatch: {
        agent: agentPatch,
      } as Partial<Conversation>,
      events: decision.groundings.length
        ? ["agent.grounded_reply"]
        : ["agent.clarify"],
    };
  }

  return { decision, handled: false, replies: [] };
}
