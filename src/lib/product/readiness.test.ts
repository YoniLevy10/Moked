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
        tenantKnowledge: [],
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
  it("table-driven failing checks in demo (no network)", async () => {
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
          bot: {
            ...tenant.bot,
            approved: "ok",
            approvedAt: new Date().toISOString(),
          },
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
      assert.ok(
        !report.checks.some((ch) => ch.id === "token_valid"),
        "demo must not run Graph checks",
      );
    }
  });

  it("demo connect becomes ready without Meta number / live token", async () => {
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
    assert.equal(report.demoReady, true);
    assert.equal(report.liveReady, false);
    assert.ok(!report.checks.some((c) => c.id === "token_valid"));
  });

  it("live-test / demo simulation never yields liveReady under forceLive", async () => {
    process.env.MOKED_PROVIDER_MODE = "demo";
    process.env.META_APP_ID = "app_expected";
    process.env.META_APP_SECRET = "sec";
    process.env.META_EMBEDDED_SIGNUP_CONFIG_ID = "cfg";
    process.env.META_WEBHOOK_VERIFY_TOKEN = "verify_prod_token";
    const tenant = await createTenant({
      businessName: "סימולציה",
      ownerName: "בעלים",
      phone: "0508888888",
      vertical: "trades",
    });
    await connectWhatsAppDemo(tenant.id);
    await updateTenant(tenant.id, {
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
      new Response(
        JSON.stringify({ name_status: "APPROVED", status: "CONNECTED" }),
        { status: 200 },
      )) as typeof fetch;
    try {
      const liveReport = await evaluateReadiness(tenant.id, {
        bypassCache: true,
        forceLive: true,
      });
      assert.equal(liveReport.mode, "live");
      assert.equal(liveReport.liveReady, false);
      assert.equal(liveReport.ready, false);
      assert.ok(
        liveReport.checks.some(
          (c) => c.id === "live_channel_not_simulated" && !c.ok && c.blocking,
        ),
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
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

  it("refuses in live mode when Graph checks missing (mocked fetch)", async () => {
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

describe("live webhook_subscribed probe", () => {
  it("phone GET alone does not green webhook_subscribed", async () => {
    process.env.MOKED_PROVIDER_MODE = "live";
    process.env.META_APP_ID = "app_expected";
    process.env.META_APP_SECRET = "sec";
    process.env.META_EMBEDDED_SIGNUP_CONFIG_ID = "cfg";
    process.env.META_WEBHOOK_VERIFY_TOKEN = "verify_prod_token";
    const tenant = await createTenant({
      businessName: "Webhook Probe",
      ownerName: "בעלים",
      phone: "0505555555",
      vertical: "other",
    });
    await updateTenant(tenant.id, {
      whatsapp: {
        connected: true,
        mode: "live",
        phoneNumberId: "pn_live",
        wabaId: "waba_live",
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
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/subscribed_apps")) {
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
      }
      // Phone node succeeds — previously this falsely set webhook_subscribed.
      return new Response(
        JSON.stringify({
          name_status: "APPROVED",
          verified_name: "Demo Biz",
          status: "CONNECTED",
        }),
        { status: 200 },
      );
    }) as typeof fetch;

    try {
      const report = await evaluateReadiness(tenant.id, { bypassCache: true });
      assert.equal(report.mode, "live");
      assert.equal(report.ready, false);
      assert.equal(report.liveReady, false);
      const webhook = report.checks.find((c) => c.id === "webhook_subscribed");
      assert.ok(webhook);
      assert.equal(webhook!.ok, false);
      assert.equal(webhook!.blocking, true);
      const token = report.checks.find((c) => c.id === "token_valid");
      assert.equal(token?.ok, true);
    } finally {
      globalThis.fetch = originalFetch;
      process.env.MOKED_PROVIDER_MODE = "demo";
    }
  });

  it("ready when subscribed_apps includes META_APP_ID", async () => {
    process.env.MOKED_PROVIDER_MODE = "live";
    process.env.META_APP_ID = "app_expected";
    process.env.META_APP_SECRET = "sec";
    process.env.META_EMBEDDED_SIGNUP_CONFIG_ID = "cfg";
    process.env.META_WEBHOOK_VERIFY_TOKEN = "verify_prod_token";
    const tenant = await createTenant({
      businessName: "Webhook OK",
      ownerName: "בעלים",
      phone: "0506666666",
      vertical: "other",
    });
    await updateTenant(tenant.id, {
      whatsapp: {
        connected: true,
        mode: "live",
        phoneNumberId: "pn_ok",
        wabaId: "waba_ok",
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
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/subscribed_apps")) {
        return new Response(
          JSON.stringify({
            data: [
              {
                whatsapp_business_api_data: {
                  id: "app_expected",
                  name: "Moked",
                },
              },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          name_status: "APPROVED",
          verified_name: "OK",
          status: "CONNECTED",
        }),
        { status: 200 },
      );
    }) as typeof fetch;

    try {
      const report = await evaluateReadiness(tenant.id, { bypassCache: true });
      assert.equal(report.ready, true);
      assert.equal(report.liveReady, true);
      assert.ok(
        report.checks.every((c) => !c.blocking || c.ok),
        "all blocking checks green",
      );
    } finally {
      globalThis.fetch = originalFetch;
      process.env.MOKED_PROVIDER_MODE = "demo";
    }
  });

  it("forceLive go-live path fails without subscribed_apps even in demo provider mode", async () => {
    process.env.MOKED_PROVIDER_MODE = "demo";
    process.env.META_APP_ID = "app_expected";
    process.env.META_APP_SECRET = "sec";
    process.env.META_EMBEDDED_SIGNUP_CONFIG_ID = "cfg";
    process.env.META_WEBHOOK_VERIFY_TOKEN = "verify_prod_token";
    const tenant = await createTenant({
      businessName: "Go Live Gate",
      ownerName: "בעלים",
      phone: "0507777777",
      vertical: "trades",
    });
    await connectWhatsAppDemo(tenant.id);
    await updateTenant(tenant.id, {
      whatsapp: {
        connected: true,
        mode: "demo",
        phoneNumberId: "pn_gl",
        wabaId: "waba_gl",
        accessToken: "tok",
      },
      subscription: { status: "active", monthlyOutboundCap: 1000, outboundCount: 0 },
      bot: {
        ...tenant.bot,
        approved: "ok",
        approvedAt: new Date().toISOString(),
      },
    });
    bustReadinessCache(tenant.id);

    const demoReport = await evaluateReadiness(tenant.id, { bypassCache: true });
    assert.equal(demoReport.mode, "demo");
    assert.equal(demoReport.ready, true);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/subscribed_apps")) {
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
      }
      return new Response(
        JSON.stringify({ name_status: "APPROVED" }),
        { status: 200 },
      );
    }) as typeof fetch;

    try {
      const liveReport = await evaluateReadiness(tenant.id, {
        bypassCache: true,
        forceLive: true,
      });
      assert.equal(liveReport.mode, "live");
      assert.equal(liveReport.ready, false);
      assert.ok(
        liveReport.checks.some(
          (c) => c.id === "webhook_subscribed" && !c.ok && c.blocking,
        ),
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
