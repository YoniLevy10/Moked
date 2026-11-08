import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  crossedSoftCap,
  outboundUsage,
  SOFT_CAP_RATIO,
} from "@/lib/product/usage-caps";
import { DEFAULT_OUTBOUND_CAP } from "@/lib/product/model";
import { currentPeriod } from "@/lib/product/model";
import type { Tenant } from "@/lib/types";

function tenantWithOutbound(count: number, cap = DEFAULT_OUTBOUND_CAP): Tenant {
  return {
    id: "t1",
    businessName: "בדיקה",
    ownerName: "בעלים",
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
    pricing: [],
    subscription: {
      status: "active",
      monthlyOutboundCap: cap,
      outboundCount: count,
      outboundPeriod: currentPeriod(),
    },
    bot: {
      draft: "",
      answers: { what: "", hours: "", forbidden: "", handoff: "", pasted: "" },
    },
  };
}

describe("usage caps", () => {
  it("keeps DEFAULT_OUTBOUND_CAP at 1000", () => {
    assert.equal(DEFAULT_OUTBOUND_CAP, 1000);
    assert.equal(SOFT_CAP_RATIO, 0.8);
  });

  it("detects soft-cap crossing at 80%", () => {
    assert.equal(
      crossedSoftCap({ previousCount: 799, nextCount: 800, cap: 1000 }),
      true,
    );
    assert.equal(
      crossedSoftCap({ previousCount: 800, nextCount: 801, cap: 1000 }),
      false,
    );
    assert.equal(
      crossedSoftCap({ previousCount: 0, nextCount: 10, cap: 1000 }),
      false,
    );
  });

  it("reports softReached without hard block", () => {
    const soft = outboundUsage(tenantWithOutbound(800));
    assert.equal(soft.softReached, true);
    assert.equal(soft.hardReached, false);
    const hard = outboundUsage(tenantWithOutbound(1000));
    assert.equal(hard.hardReached, true);
    assert.equal(hard.softReached, false);
  });
});
