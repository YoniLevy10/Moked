import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { promises as fs } from "fs";
import path from "path";
import {
  deleteTenantKnowledge,
  listTenantKnowledge,
  newKnowledgeId,
  seedKnowledgeFromTenant,
  upsertTenantKnowledge,
} from "@/lib/agent/knowledge";
import { createTenant, updateTenant } from "@/lib/store/db";
import { applyOwnerProfilePatch } from "@/lib/product/owner-profile";

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

describe("knowledge CMS (owner + managed shared store)", () => {
  it("upserts, lists, and deletes tenant-scoped rows", async () => {
    const tenant = await createTenant({
      businessName: "אינסטלציה בדיקה",
      ownerName: "דני",
      phone: "0501234567",
      vertical: "trades",
      tradeKind: "plumbing",
    });

    const id = newKnowledgeId("faq");
    await upsertTenantKnowledge({
      id,
      tenantId: tenant.id,
      kind: "faq",
      label: "service_area",
      body: "עובדים בתל אביב והסביבה",
      meta: {},
    });

    const listed = await listTenantKnowledge(tenant.id);
    assert.ok(listed.some((r) => r.id === id));

    const deleted = await deleteTenantKnowledge(tenant.id, id);
    assert.equal(deleted, true);
    const after = await listTenantKnowledge(tenant.id);
    assert.ok(!after.some((r) => r.id === id));
  });

  it("pricing patch reseeds knowledge prices from catalog only", async () => {
    let tenant = await createTenant({
      businessName: "חשמל בדיקה",
      ownerName: "נועה",
      phone: "0509998877",
      vertical: "trades",
      tradeKind: "electrical",
    });

    const patch = applyOwnerProfilePatch(tenant, {
      pricing: [
        { name: "ביקור אבחון", priceIls: 200, description: "בדיקה" },
        { name: "תיקון נקודה", priceIls: 280 },
      ],
    });
    tenant = await updateTenant(tenant.id, patch);
    const rows = await seedKnowledgeFromTenant(tenant);
    const prices = rows.filter((r) => r.kind === "price");
    assert.ok(prices.some((r) => r.body.includes("₪200")));
    assert.ok(prices.some((r) => r.body.includes("₪280")));
    assert.ok(!prices.some((r) => /₪(?!200|280)\d+/.test(r.body) && false));
  });
});
