import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  TRADE_PACKS,
  applyTradesPackToTenant,
  tradesKnowledgeRows,
  tradesProcessPreset,
} from "@/lib/verticals/trades/pack";
import { proposeVisitSlots } from "@/lib/trades/slots";
import { proposeSlots } from "@/lib/integrations/calendar";
import { defaultAvailability, type Tenant } from "@/lib/types";

function baseTenant(): Tenant {
  return {
    id: "t1",
    businessName: "בדיקה",
    ownerName: "יוסי",
    phone: "0500000000",
    vertical: "other",
    locale: "he-IL",
    createdAt: new Date().toISOString(),
    whatsapp: { connected: false, mode: "demo" },
    processes: tradesProcessPreset(),
    integrations: {
      googleCalendar: false,
      paymentsProvider: "none",
      invoicingProvider: "none",
    },
    availability: defaultAvailability(),
    pricing: [],
    subscription: {
      status: "inactive",
      monthlyOutboundCap: 1000,
      outboundCount: 0,
    },
    bot: {
      draft: "",
      answers: {
        what: "",
        hours: "",
        forbidden: "",
        handoff: "",
        pasted: "",
      },
    },
  };
}

describe("trades knowledge pack", () => {
  it("covers five beachhead niches with Hebrew assets", () => {
    const kinds = Object.keys(TRADE_PACKS);
    assert.deepEqual(
      kinds.sort(),
      ["electrical", "handyman", "hvac", "plumbing", "renovation"].sort(),
    );
    for (const pack of Object.values(TRADE_PACKS)) {
      assert.ok(pack.pricing.length >= 2);
      assert.ok(pack.questions.length >= 3);
      assert.ok(pack.adLines.length >= 1);
      assert.ok(pack.landingHeadline.includes("WhatsApp"));
    }
  });

  it("applies plumbing pack pricing + process preset (payment off)", () => {
    const packed = applyTradesPackToTenant(baseTenant(), "plumbing");
    assert.equal(packed.vertical, "trades");
    assert.equal(packed.processes.payment.enabled, false);
    assert.equal(packed.processes.booking.enabled, true);
    assert.ok(packed.pricing.some((p) => p.name.includes("ביקור")));
    assert.match(packed.bot.answers.what ?? "", /נזילות|אינסטל/);
    assert.equal(packed.integrations.googleCalendar, false);
  });

  it("seeds knowledge rows for FAQ/policy/questions", () => {
    const rows = tradesKnowledgeRows("t1", "electrical");
    assert.ok(rows.some((r) => r.kind === "faq"));
    assert.ok(rows.some((r) => r.kind === "forbidden"));
    assert.ok(rows.some((r) => r.meta?.role === "qualification"));
  });
});

describe("visit slot scheduler", () => {
  it("trades pack seeds availability; empty availability invents nothing", () => {
    const now = new Date("2026-11-08T08:00:00Z"); // Sunday
    assert.deepEqual(proposeVisitSlots({ now, count: 3 }), []);
    const packed = applyTradesPackToTenant(baseTenant(), "plumbing");
    assert.ok(packed.availability.windows.length > 0);
    assert.ok(packed.availability.dailyCapacity > 0);
    const slots = proposeVisitSlots({
      availability: packed.availability,
      now,
      count: 3,
    });
    assert.equal(slots.length, 3);
    assert.ok(slots.every((s) => s.label && s.startsAt));
    assert.deepEqual(
      proposeSlots(packed.availability, { now, count: 3 }),
      slots,
    );
  });
});
