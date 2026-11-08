import {
  findPricedService,
  retrieveGroundings,
  type Grounding,
} from "@/lib/agent/knowledge";
import { checkingReply } from "@/lib/agent/policy";
import {
  AgentDecision,
  AgentLanguage,
  Intent,
  TenantKnowledgeRow,
} from "@/lib/agent/types";
import { proposeSlotsForTenant } from "@/lib/integrations/calendar";
import { customerPaymentsEnabled } from "@/lib/product/flags";
import { Conversation, ProcessKey, Tenant } from "@/lib/types";

export type AgentToolName =
  | "lookup_price"
  | "propose_slots"
  | "start_process"
  | "escalate"
  | "answer_from_knowledge";

export type AgentToolContext = {
  tenant: Tenant;
  conversation: Conversation;
  language: AgentLanguage;
  knowledge: TenantKnowledgeRow[];
};

export type AgentToolResult = {
  ok: boolean;
  /** Machine-readable payload for the model */
  data: Record<string, unknown>;
  /** Groundings discovered by this tool call (prices/knowledge only). */
  groundings: Grounding[];
  /** Optional decision patch when the tool settles nextAction. */
  decisionPatch?: Partial<AgentDecision>;
};

/** OpenAI-compatible tool schemas. Prices/availability must come from these only. */
export const AGENT_TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "lookup_price",
      description:
        "Look up an exact price from pricing_items for this tenant. Never invent a price.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Service or item name from the customer message",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "propose_slots",
      description:
        "Propose visit slots from tenant availability (hours + capacity). Never invent availability.",
      parameters: {
        type: "object",
        properties: {
          count: {
            type: "number",
            description: "How many slots to propose (default 3)",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "start_process",
      description:
        "Hand control to the deterministic process engine (booking, quote, intake, …).",
      parameters: {
        type: "object",
        properties: {
          processKey: {
            type: "string",
            // Wave D "payment" is omitted unless MOKED_ENABLE_CUSTOMER_PAYMENTS=true
            // (enum filtered at execute time; keep listed only when enabled).
            enum: [
              "intake",
              "qualification",
              "booking",
              "reminders",
              "retention",
              "quote",
              ...(process.env.MOKED_ENABLE_CUSTOMER_PAYMENTS === "true"
                ? (["payment"] as const)
                : []),
            ],
          },
        },
        required: ["processKey"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "escalate",
      description: "Hand the conversation to a human owner.",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string" },
          reply: {
            type: "string",
            description: "Short customer-facing reply in their language",
          },
        },
        required: ["reason"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "answer_from_knowledge",
      description:
        "Retrieve authorized FAQ/hours/area/policy text from tenant knowledge. Not for prices.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          kinds: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "service",
                "hours",
                "area",
                "policy",
                "faq",
                "forbidden",
              ],
            },
          },
        },
        required: ["query"],
      },
    },
  },
];

export async function executeAgentTool(
  name: string,
  args: Record<string, unknown>,
  ctx: AgentToolContext,
): Promise<AgentToolResult> {
  switch (name as AgentToolName) {
    case "lookup_price": {
      const query = String(args.query ?? "").trim();
      const hit = findPricedService(query, ctx.tenant);
      if (!hit) {
        return {
          ok: false,
          data: {
            found: false,
            message: "No matching pricing_items row",
          },
          groundings: [],
          decisionPatch: {
            intent: "price_question",
            nextAction: "escalate",
            reply: checkingReply(ctx.language),
          },
        };
      }
      return {
        ok: true,
        data: {
          found: true,
          name: hit.name,
          priceIls: hit.priceIls,
          source: hit.grounding.source,
        },
        groundings: [hit.grounding],
      };
    }
    case "propose_slots": {
      const count =
        typeof args.count === "number" && args.count > 0
          ? Math.min(5, Math.floor(args.count))
          : 3;
      const slots = proposeSlotsForTenant(ctx.tenant, { count });
      if (slots.length === 0) {
        return {
          ok: false,
          data: { slots: [], message: "no_availability" },
          groundings: [],
          decisionPatch: {
            intent: "availability",
            nextAction: "route_process",
            processKey: "booking",
          },
        };
      }
      return {
        ok: true,
        data: {
          slots: slots.map((s) => ({
            startsAt: s.startsAt,
            label: s.label,
          })),
        },
        groundings: [
          {
            source: "availability:propose_slots",
            text: slots.map((s) => s.label).join(" · "),
          },
        ],
        decisionPatch: {
          intent: "availability",
          nextAction: "route_process",
          processKey: "booking",
        },
      };
    }
    case "start_process": {
      const processKey = String(args.processKey ?? "") as ProcessKey;
      const allowed: ProcessKey[] = [
        "intake",
        "qualification",
        "booking",
        "reminders",
        "retention",
        "quote",
      ];
      if (customerPaymentsEnabled()) allowed.push("payment");
      if (!allowed.includes(processKey)) {
        return {
          ok: false,
          data: { error: "invalid_process" },
          groundings: [],
        };
      }
      const intentFor: Partial<Record<ProcessKey, Intent>> = {
        booking: "book",
        quote: "price_question",
        intake: "unknown",
        payment: "unknown",
      };
      return {
        ok: true,
        data: { processKey },
        groundings: [],
        decisionPatch: {
          intent: intentFor[processKey] ?? "unknown",
          nextAction: "route_process",
          processKey,
        },
      };
    }
    case "escalate": {
      const reason = String(args.reason ?? "human_request");
      const reply =
        typeof args.reply === "string" && args.reply.trim()
          ? args.reply.trim()
          : checkingReply(ctx.language);
      return {
        ok: true,
        data: { reason },
        groundings: [],
        decisionPatch: {
          intent: "human_request",
          nextAction: "escalate",
          reply,
        },
      };
    }
    case "answer_from_knowledge": {
      const query = String(args.query ?? "").trim();
      const kinds = Array.isArray(args.kinds)
        ? (args.kinds as TenantKnowledgeRow["kind"][])
        : (["faq", "hours", "area", "policy", "service"] as const);
      const groundings = retrieveGroundings({
        query,
        rows: ctx.knowledge,
        kinds: [...kinds],
        limit: 4,
      });
      return {
        ok: groundings.length > 0,
        data: {
          found: groundings.length > 0,
          snippets: groundings.map((g) => ({
            source: g.source,
            text: g.text,
          })),
        },
        groundings,
      };
    }
    default:
      return {
        ok: false,
        data: { error: "unknown_tool", name },
        groundings: [],
      };
  }
}
