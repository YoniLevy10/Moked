import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { promises as fs } from "fs";
import path from "path";
import {
  applyPackToTenant,
  getVerticalPack,
  knowledgeSeedForVertical,
  listVerticalPacks,
  resolveVerticalPack,
} from "@/lib/verticals/registry";
import { createTenant } from "@/lib/store/db";
import { defaultAvailability, type Tenant } from "@/lib/types";
import { tradesProcessPreset } from "@/lib/verticals/trades/pack";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

async function resetFileDb() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(
    DB_FILE,
    JSON.stringify(
      {
        tenants: [],
        conversations: [],
        messages: [],
        businessEvents: [],
        prospects: [],
        phoneNumbers: [],
        webhookEvents: [],
        templates: [],
        tenantKnowledge: [],
        activeTenantId: null,
      },
      null,
      2,
    ),
  );
}

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

describe("vertical pack registry", () => {
  it("resolves trades pack and no-ops for other", () => {
    const trades = resolveVerticalPack("trades");
    assert.ok(trades);
    assert.equal(trades.id, "trades");
    assert.equal(trades.vertical, "trades");
    assert.equal(getVerticalPack("trades").id, "trades");
    assert.equal(listVerticalPacks().length, 1);
    assert.equal(resolveVerticalPack("other"), null);
    assert.equal(resolveVerticalPack("clinic"), null);
    assert.equal(resolveVerticalPack(undefined), null);
  });

  it("applyPackToTenant seeds trades knowledge/availability; other unchanged", () => {
    const packed = applyPackToTenant(baseTenant(), "trades", {
      niche: "plumbing",
    });
    assert.equal(packed.vertical, "trades");
    assert.ok(packed.availability.windows.length > 0);
    assert.ok(packed.availability.dailyCapacity > 0);
    assert.ok(packed.pricing.some((p) => p.name.includes("ביקור")));
    assert.equal(packed.processes.payment.enabled, false);

    const rows = knowledgeSeedForVertical("trades", "t1", {
      niche: "electrical",
    });
    assert.ok(rows.some((r) => r.kind === "faq"));
    assert.ok(rows.some((r) => r.kind === "forbidden"));

    const other = applyPackToTenant(baseTenant(), "other");
    assert.equal(other.vertical, "other");
    assert.deepEqual(other.availability, defaultAvailability());
    assert.deepEqual(knowledgeSeedForVertical("other", "t1"), []);
  });

  it("creating trades tenant still seeds knowledge/availability as today", async () => {
    delete process.env.DATABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    await resetFileDb();

    const tenant = await createTenant({
      businessName: "אינסטלציה כהן",
      ownerName: "דני",
      phone: "0501234567",
      vertical: "trades",
      tradeKind: "plumbing",
    });

    assert.equal(tenant.vertical, "trades");
    assert.ok(tenant.availability.windows.length > 0);
    assert.ok(tenant.availability.dailyCapacity > 0);
    assert.ok(tenant.pricing.some((p) => /ביקור|סתימ|נזיל/.test(p.name)));
    assert.match(tenant.bot.answers.what ?? "", /נזילות|אינסטל/);
    assert.equal(tenant.processes.booking.enabled, true);
    assert.equal(tenant.processes.payment.enabled, false);

    const other = await createTenant({
      businessName: "עסק אחר",
      ownerName: "רן",
      phone: "0509999999",
      vertical: "other",
    });
    assert.equal(other.vertical, "other");
    assert.equal(other.availability.windows.length, 0);
  });
});
