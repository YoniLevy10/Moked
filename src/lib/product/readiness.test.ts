import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { promises as fs } from "fs";
import path from "path";
import {
  bustReadinessCache,
  evaluateReadiness,
} from "@/lib/product/readiness";
import {
  createTenant,
  updateTenant,
  connectWhatsAppDemo,
} from "@/lib/store/db";
import { handleInboundMessage } from "@/lib/processes/engine";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const ORIGINAL = { ...process.env };

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
        activeTenantId: null,
      },
      null,
      2,
    ),
  );
}

beforeEach(async () => {
  delete process.env.DATABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.MOKED_PROVIDER_MODE = "demo";
  await resetFileDb();
});

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL)) delete process.env[key];
  }
  Object.assign(process.env, ORIGINAL);
});

describe("evaluateReadiness", () => {
  it("table-driven failing checks in demo", async () => {
    const tenant = await createTenant({
      businessName: "בדיקה",
      ownerName: "בעלים",
      phone: "0501111111",
      vertical: "other",
    });
    bustReadinessCache(tenant.id);

    const cases: Array<{
      name: string;
      patch: Parameters<typeof updateTenant>[1];
      failId: string;
    }> = [
      {
        name: "whatsapp",
        patch: {},
        failId: "whatsapp_connected",
      },
      {
        name: "subscription",
        patch: {
          whatsapp: {
            connected: true,
            mode: "demo",
            phoneNumberId: "x",
          },
          subscription: { ...tenant.subscription, status: "pending" },
          bot: { ...tenant.bot, approved: "ok", approvedAt: new Date().toISOString() },
        },
        failId: "subscription_active",
      },
      {
        name: "bot",
        patch: {
          whatsapp: {
            connected: true,
            mode: "demo",
            phoneNumberId: "x",
          },
          subscription: { ...tenant.subscription, status: "active" },
          bot: { ...tenant.bot, approved: undefined, approvedAt: undefined },
        },
        failId: "bot_instructions_approved",
      },
    ];

    for (const c of cases) {
      await updateTenant(tenant.id, c.patch);
      bustReadinessCache(tenant.id);
      const report = await evaluateReadiness(tenant.id, { bypassCache: true });
      assert.equal(report.ready, false, c.name);
      assert.ok(
        report.checks.some((ch) => ch.id === c.failId && !ch.ok && ch.blocking),
        c.name,
      );
    }
  });

  it("demo connect becomes ready without Graph checks", async () => {
    const tenant = await createTenant({
      businessName: "דמו",
      ownerName: "בעלים",
      phone: "0502222222",
      vertical: "trades",
    });
    await connectWhatsAppDemo(tenant.id);
    bustReadinessCache(tenant.id);
    const report = await evaluateReadiness(tenant.id, { bypassCache: true });
    assert.equal(report.mode, "demo");
    assert.equal(report.ready, true);
    assert.ok(!report.checks.some((c) => c.id === "token_valid"));
  });
});

describe("engine readiness gate", () => {
  it("refuses process run when not ready (demo mode)", async () => {
    process.env.MOKED_PROVIDER_MODE = "demo";
    const tenant = await createTenant({
      businessName: "חסום",
      ownerName: "בעלים",
      phone: "0503333333",
      vertical: "other",
    });
    await updateTenant(tenant.id, {
      whatsapp: {
        connected: true,
        mode: "demo",
        phoneNumberId: `demo_${tenant.id}`,
      },
      subscription: { ...tenant.subscription, status: "inactive" },
    });
    bustReadinessCache(tenant.id);
    const fresh = await (
      await import("@/lib/store/db")
    ).getTenantById(tenant.id);
    assert.ok(fresh);
    const result = await handleInboundMessage({
      tenant: fresh!,
      customerWaId: "972500000001",
      text: "שלום",
    });
    assert.deepEqual(result.result.events, ["tenant.blocked"]);
    assert.equal(result.result.replies.length, 0);
  });

  it("refuses in live mode when Graph checks missing", async () => {
    process.env.MOKED_PROVIDER_MODE = "live";
    const tenant = await createTenant({
      businessName: "לייב",
      ownerName: "בעלים",
      phone: "0504444444",
      vertical: "other",
    });
    await updateTenant(tenant.id, {
      whatsapp: {
        connected: true,
        mode: "live",
        phoneNumberId: "pn",
        accessToken: "tok",
      },
      subscription: { ...tenant.subscription, status: "active" },
      bot: {
        ...tenant.bot,
        approved: "ok",
        approvedAt: new Date().toISOString(),
      },
    });
    bustReadinessCache(tenant.id);
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response("{}", { status: 401 })) as typeof fetch;
    try {
      const fresh = await (
        await import("@/lib/store/db")
      ).getTenantById(tenant.id);
      const result = await handleInboundMessage({
        tenant: fresh!,
        customerWaId: "972500000002",
        text: "שלום",
      });
      assert.deepEqual(result.result.events, ["tenant.blocked"]);
    } finally {
      globalThis.fetch = originalFetch;
      process.env.MOKED_PROVIDER_MODE = "demo";
    }
  });
});
