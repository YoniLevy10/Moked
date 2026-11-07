import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { promises as fs } from "fs";
import path from "path";
import {
  connectWhatsAppDemo,
  createTenant,
  getTenantById,
} from "@/lib/store/db";
import {
  refreshPendingTemplates,
  submitTemplate,
} from "@/lib/templates/service";

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
  delete process.env.META_TEMPLATE_SUBMIT_ENABLED;
  await resetFileDb();
});

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL)) delete process.env[key];
  }
  Object.assign(process.env, ORIGINAL);
});

describe("template lifecycle", () => {
  it("submit → pending; refresh → approved", async () => {
    const tenant = await createTenant({
      businessName: "תבניות",
      ownerName: "בעלים",
      phone: "0506666666",
      vertical: "other",
    });
    await connectWhatsAppDemo(tenant.id);
    const fresh = await getTenantById(tenant.id);
    assert.ok(fresh);

    const submitted = await submitTemplate(fresh!, "booking_confirm");
    assert.equal(submitted.status, "pending");
    assert.ok(submitted.metaId);

    const refreshed = await refreshPendingTemplates(tenant.id);
    const row = refreshed.find((t) => t.name === "booking_confirm");
    assert.equal(row?.status, "approved");
  });

  it("refresh can surface rejected with reason", async () => {
    const tenant = await createTenant({
      businessName: "דחייה",
      ownerName: "בעלים",
      phone: "0507777777",
      vertical: "other",
    });
    await connectWhatsAppDemo(tenant.id);
    const fresh = await getTenantById(tenant.id);
    const submitted = await submitTemplate(fresh!, "reminder_t24");
    // Force reject fixture id for demo refresh path.
    const { upsertTemplate } = await import("@/lib/store/db");
    await upsertTemplate({
      id: submitted.id,
      tenantId: tenant.id,
      name: submitted.name,
      language: submitted.language,
      category: submitted.category,
      components: submitted.components,
      status: "pending",
      metaId: `demo_reject_${submitted.name}`,
      submittedAt: submitted.submittedAt,
    });
    const refreshed = await refreshPendingTemplates(tenant.id);
    const row = refreshed.find((t) => t.name === "reminder_t24");
    assert.equal(row?.status, "rejected");
    assert.equal(row?.rejectionReason, "DEMO_REJECTED");
  });
});
