import { z } from "zod";
import { Conversation, ProcessKey } from "@/lib/types";
import { OutboundAction } from "@/lib/processes/types";

export const IntentSchema = z.enum([
  "price_question",
  "availability",
  "book",
  "cancel",
  "reschedule",
  "hours",
  "service_area",
  "service_info",
  "complaint",
  "human_request",
  "opt_out",
  "smalltalk",
  "unknown",
]);
export type Intent = z.infer<typeof IntentSchema>;

export const AgentLanguageSchema = z.enum(["he", "ar", "en"]);
export type AgentLanguage = z.infer<typeof AgentLanguageSchema>;

export const AgentDecisionSchema = z.object({
  intent: IntentSchema,
  language: AgentLanguageSchema,
  confidence: z.number().min(0).max(1),
  slots: z.record(z.string(), z.union([z.string(), z.number(), z.null()])),
  groundings: z.array(
    z.object({
      source: z.string(),
      text: z.string(),
    }),
  ),
  nextAction: z.enum([
    "reply",
    "route_process",
    "clarify",
    "escalate",
    "opt_out",
  ]),
  processKey: z
    .enum([
      "intake",
      "qualification",
      "booking",
      "reminders",
      "retention",
      "quote",
      "payment",
    ])
    .optional(),
  reply: z.string().optional(),
});
export type AgentDecision = z.infer<typeof AgentDecisionSchema>;

export type AgentTurnUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costIls: number;
  model?: string;
};

export type AgentTurnResult = {
  decision: AgentDecision;
  handled: boolean;
  replies: OutboundAction[];
  conversationPatch?: Partial<Conversation>;
  events?: string[];
  /** Present when the LLM path ran (cost/token accounting). */
  usage?: AgentTurnUsage;
  /** Which path produced the decision. */
  source?: "llm" | "classifier" | "passthrough";
};

/** Persisted on conversations.agent jsonb */
export type ConversationAgentState = {
  stage?: string;
  lastIntent?: Intent;
  confidence?: number;
  language?: AgentLanguage;
  askedSlots?: string[];
  clarifyCount?: number;
  pendingQuestion?: string;
  escalations?: number;
  groundedCount?: number;
  optedOut?: boolean;
  turnCount?: number;
};

export type KnowledgeKind =
  | "service"
  | "price"
  | "hours"
  | "area"
  | "policy"
  | "faq"
  | "forbidden";

export type TenantKnowledgeRow = {
  id: string;
  tenantId: string;
  kind: KnowledgeKind;
  label: string;
  body: string;
  meta: Record<string, unknown>;
  updatedAt: string;
};

export type EvalCase = {
  id: string;
  text: string;
  language?: AgentLanguage;
  /** Optional pricing catalog for the fixture tenant */
  pricing?: Array<{ id: string; name: string; priceIls: number }>;
  answers?: Partial<{
    what: string;
    hours: string;
    forbidden: string;
    handoff: string;
    pasted: string;
  }>;
  knowledge?: Array<Pick<TenantKnowledgeRow, "kind" | "label" | "body">>;
  conversation?: Partial<Conversation>;
  expect: {
    intent?: Intent | Intent[];
    nextAction: AgentDecision["nextAction"] | AgentDecision["nextAction"][];
    mustInclude?: string[];
    mustNotInclude?: string[];
    /** Hard gate: reply must not invent these currency amounts */
    forbidPriceNumbers?: boolean;
  };
};

export type ProcessKeyRoute = ProcessKey;
