import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { promises as fs } from "fs";
import path from "path";
import {
  connectWhatsAppDemo,
  createTenant,
  updateTenant,
} from "@/lib/store/db";
import { handleInboundMessage } from "@/lib/processes/engine";
import { bustReadinessCache } from "@/lib/product/readiness";

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
        tenantKnowledge: [],
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

describe("live onboarding שלום on new ad number", () => {
  it("replies after demo number connect with business context", async () => {
    let tenant = await createTenant({
      businessName: "אינסטלציה כהן",
      ownerName: "דני",
      phone: "0501234567",
      vertical: "trades",
      tradeKind: "plumbing",
    });
    tenant = await updateTenant(tenant.id, {
      subscription: { ...tenant.subscription, status: "active" },
      bot: {
        ...tenant.bot,
        approved: tenant.bot.draft || "מענה לאינסטלציה",
        approvedAt: new Date().toISOString(),
      },
    });
    tenant = await connectWhatsAppDemo(tenant.id);
    bustReadinessCache(tenant.id);

    const result = await handleInboundMessage({
      tenant,
      customerWaId: "972501234567",
      customerName: "דני",
      text: "שלום",
    });

    assert.ok(!(result.result.events ?? []).includes("tenant.blocked"));
    assert.ok(result.result.replies.length > 0);
    const joined = result.result.replies.map((r) => r.body).join("\n");
    assert.match(joined, /שלום|היי|כהן|אינסטל|פנייה|תודה/i);
  });
});
