import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { promises as fs } from "fs";
import path from "path";
import {
  applyPackToTenant,
  getVerticalPack,
  knowledgeSeedForVertical,
  listVerticalPacks,
  qualificationQuestionsForVertical,
  resolveVerticalPack,
  slotPolicyForVertical,
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
  it("resolves trades + appointments; no-ops clinic/other", () => {
    const trades = resolveVerticalPack("trades");
    assert.ok(trades);
    assert.equal(trades.id, "trades");
    assert.equal(getVerticalPack("trades").id, "trades");

    const beauty = resolveVerticalPack("beauty");
    assert.ok(beauty);
    assert.equal(beauty.id, "appointments");
    assert.equal(resolveVerticalPack("coach")?.id, "appointments");
    assert.equal(getVerticalPack("appointments").id, "appointments");

    assert.equal(listVerticalPacks().length, 2);
    assert.equal(resolveVerticalPack("other"), null);
    assert.equal(resolveVerticalPack("clinic"), null);
    assert.equal(resolveVerticalPack("realty"), null);
    assert.equal(resolveVerticalPack(undefined), null);
  });

  it("slot policy: trades site visit, appointments in-place", () => {
    assert.deepEqual(slotPolicyForVertical("trades"), {
      model: "site_visit",
      collectAddress: true,
    });
    assert.deepEqual(slotPolicyForVertical("beauty"), {
      model: "appointment",
      collectAddress: false,
    });
    assert.deepEqual(slotPolicyForVertical("other"), {
      model: "site_visit",
      collectAddress: true,
    });
    assert.match(
      qualificationQuestionsForVertical("coach")[0] ?? "",
      /תור/,
    );
    assert.match(
      qualificationQuestionsForVertical("trades")[0] ?? "",
      /ביקור/,
    );
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

  it("applyPackToTenant seeds appointments (beauty/coach) without clinics", () => {
    const beauty = applyPackToTenant(baseTenant(), "beauty", {
      niche: "beauty",
    });
    assert.equal(beauty.vertical, "beauty");
    assert.ok(beauty.pricing.some((p) => /תספורת|מניקור|צבע/.test(p.name)));
    assert.equal(beauty.availability.dailyCapacity, 10);
    assert.equal(beauty.processes.payment.enabled, false);

    const coach = applyPackToTenant(baseTenant(), "coach");
    assert.equal(coach.vertical, "coach");
    assert.ok(coach.pricing.some((p) => /אימון|מפגש|היכרות/.test(p.name)));

    const rows = knowledgeSeedForVertical("beauty", "t1", { niche: "beauty" });
    assert.ok(rows.some((r) => r.meta?.bookingModel === "appointment"));
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

  it("creating beauty tenant seeds appointments pack", async () => {
    delete process.env.DATABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    await resetFileDb();

    const tenant = await createTenant({
      businessName: "סטודיו נועה",
      ownerName: "נועה",
      phone: "0502222222",
      vertical: "beauty",
    });

    assert.equal(tenant.vertical, "beauty");
    assert.ok(tenant.availability.dailyCapacity >= 10);
    assert.ok(tenant.pricing.some((p) => /תספורת|מניקור|צבע/.test(p.name)));
    assert.equal(tenant.processes.booking.enabled, true);
    assert.equal(tenant.processes.payment.enabled, false);
  });
});
