import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { enforceNoInventedPrices } from "@/lib/agent/llm";
import type { AgentDecision } from "@/lib/agent/types";
import type { Tenant } from "@/lib/types";

const tenant = {
  id: "t1",
  businessName: "טסט",
  ownerName: "א",
  phone: "0500000000",
  vertical: "trades",
  locale: "he-IL",
  createdAt: new Date().toISOString(),
  whatsapp: { connected: true, mode: "demo" },
  processes: {} as Tenant["processes"],
  integrations: {
    googleCalendar: false,
    paymentsProvider: "none",
    invoicingProvider: "none",
  },
  availability: { timezone: "Asia/Jerusalem", windows: [], dailyCapacity: 0 },
  pricing: [{ id: "p1", name: "ביקור", priceIls: 250 }],
  subscription: {
    status: "active",
    monthlyOutboundCap: 1000,
    outboundCount: 0,
  },
  bot: {
    draft: "",
    answers: { what: "", hours: "", forbidden: "", handoff: "", pasted: "" },
  },
} as Tenant;

describe("enforceNoInventedPrices", () => {
  it("allows catalog prices in grounded replies", () => {
    const decision: AgentDecision = {
      intent: "price_question",
      language: "he",
      confidence: 0.9,
      slots: {},
      groundings: [{ source: "pricing_items:ביקור", text: "ביקור: ₪250" }],
      nextAction: "reply",
      reply: "ביקור עולה ₪250. מתי נוח לך?",
    };
    const out = enforceNoInventedPrices(decision, tenant);
    assert.equal(out.nextAction, "reply");
    assert.match(out.reply ?? "", /250/);
  });

  it("escalates when reply invents a non-catalog amount", () => {
    const decision: AgentDecision = {
      intent: "price_question",
      language: "he",
      confidence: 0.9,
      slots: {},
      groundings: [],
      nextAction: "reply",
      reply: "זה עולה ₪9999 בלי בעיה",
    };
    const out = enforceNoInventedPrices(decision, tenant);
    assert.equal(out.nextAction, "escalate");
    assert.doesNotMatch(out.reply ?? "", /9999/);
  });
});
