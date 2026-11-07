import { Tenant } from "@/lib/types";
import { ConversationAgentState, Intent } from "@/lib/agent/types";
import { Grounding } from "@/lib/agent/knowledge";

/**
 * Deterministic prompt skeleton (Hebrew output instructions).
 * Used when MOKED_LLM_API_KEY is set; Zod validates model JSON separately.
 */
export function buildAgentPrompt(input: {
  tenant: Tenant;
  groundings: Grounding[];
  activeProcess?: string;
  stage?: string;
  askedSlots?: string[];
  forbidden?: string;
}): string {
  const prices = (input.tenant.pricing ?? [])
    .map((p) => `${p.name}: ₪${p.priceIls}`)
    .join("; ");
  const services = (input.tenant.pricing ?? []).map((p) => p.name).join(", ");
  const hours = input.tenant.bot?.answers?.hours ?? "";
  const area =
    input.groundings.find((g) => g.source.startsWith("area"))?.text ?? "";
  const policies = input.tenant.bot?.answers?.handoff ?? "";
  const forbidden =
    input.forbidden ?? input.tenant.bot?.answers?.forbidden ?? "";

  const authorized = input.groundings
    .map((g) => `- (${g.source}) ${g.text}`)
    .join("\n");

  return `You are the assistant of ${input.tenant.businessName}. You answer customers on WhatsApp.
Authorized information, only what appears here:
services: ${services}
prices: ${prices}
hours: ${hours}
area: ${area}
policies: ${policies}
forbidden: ${forbidden}
groundings:
${authorized || "(none)"}
style: up to three lines, one question at the end, no emoji.
rules: never invent a price or availability. No source means nextAction=escalate and
reply "Good question, I am checking and will confirm". Active process: ${input.activeProcess ?? "none"},
stage: ${input.stage ?? "none"}, already asked: ${(input.askedSlots ?? []).join(", ") || "none"}. Return JSON matching the schema only.`;
}

export function mergeAgentState(
  prev: ConversationAgentState | undefined,
  patch: {
    intent: Intent;
    confidence: number;
    language: ConversationAgentState["language"];
    nextAction: string;
    grounded: boolean;
  },
): ConversationAgentState {
  const clarifyCount =
    patch.nextAction === "clarify" ? (prev?.clarifyCount ?? 0) + 1 : prev?.clarifyCount ?? 0;
  const escalations =
    patch.nextAction === "escalate"
      ? (prev?.escalations ?? 0) + 1
      : prev?.escalations ?? 0;
  return {
    ...prev,
    lastIntent: patch.intent,
    confidence: patch.confidence,
    language: patch.language,
    clarifyCount,
    escalations,
    groundedCount: (prev?.groundedCount ?? 0) + (patch.grounded ? 1 : 0),
    turnCount: (prev?.turnCount ?? 0) + 1,
    optedOut: patch.nextAction === "opt_out" ? true : prev?.optedOut,
  };
}
