import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { promises as fs } from "fs";
import path from "path";
import { conversationVisibleToTenant } from "@/lib/auth/conversation-access";
import {
  createTenant,
  getActiveTenant,
  getConversationById,
  getOrCreateConversation,
  setActiveTenantId,
  updateTenant,
} from "@/lib/store/db";
import { startCheckout } from "@/lib/product/billing";

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
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.MOKED_PROVIDER_MODE = "demo";
  await resetFileDb();
});

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL)) delete process.env[key];
  }
  Object.assign(process.env, ORIGINAL);
});

describe("tenant isolation + superadmin active tenant", () => {
  it("persists active tenant selection (not tenants[0] only)", async () => {
    const first = await createTenant({
      businessName: "ראשון",
      ownerName: "א",
      phone: "0501111111",
      vertical: "trades",
    });
    const second = await createTenant({
      businessName: "שני",
      ownerName: "ב",
      phone: "0502222222",
      vertical: "trades",
    });
    // createTenant sets active to the newest tenant
    assert.equal((await getActiveTenant())?.id, second.id);

    const activated = await setActiveTenantId(first.id);
    assert.equal(activated.id, first.id);
    assert.equal((await getActiveTenant())?.id, first.id);

    // Switching again must stick
    await setActiveTenantId(second.id);
    assert.equal((await getActiveTenant())?.id, second.id);
  });

  it("blocks cross-tenant conversation reads for owners", async () => {
    const a = await createTenant({
      businessName: "א",
      ownerName: "א",
      phone: "0501111111",
      vertical: "trades",
    });
    const b = await createTenant({
      businessName: "ב",
      ownerName: "ב",
      phone: "0502222222",
      vertical: "trades",
    });
    const conv = await getOrCreateConversation({
      tenantId: a.id,
      customerWaId: "972500000001",
    });
    const loaded = await getConversationById(conv.id);
    assert.ok(loaded);
    assert.equal(conversationVisibleToTenant(loaded, a.id, "owner"), true);
    assert.equal(conversationVisibleToTenant(loaded, b.id, "owner"), false);
  });

  it("SaaS checkout stores subscription.externalId for webhook correlation", async () => {
    const tenant = await createTenant({
      businessName: "גבייה",
      ownerName: "ג",
      phone: "0503333333",
      vertical: "trades",
    });
    const checkout = await startCheckout(tenant.id);
    assert.equal(checkout.status, "pending");
    assert.ok(checkout.externalId);
    assert.equal(checkout.checkoutUrl, null); // demo mode honest
    assert.equal(checkout.billingConnected, false);

    // externalId must be queryable (billing webhook path)
    const { getTenantBySubscriptionExternalId } = await import(
      "@/lib/store/db"
    );
    const found = await getTenantBySubscriptionExternalId(checkout.externalId);
    assert.equal(found?.id, tenant.id);

    // Unrelated tenant cannot claim that external id
    const other = await createTenant({
      businessName: "אחר",
      ownerName: "ד",
      phone: "0504444444",
      vertical: "trades",
    });
    await updateTenant(other.id, {
      subscription: {
        ...other.subscription,
        externalId: "someone_else",
      },
    });
    const wrong = await getTenantBySubscriptionExternalId("someone_else");
    assert.equal(wrong?.id, other.id);
    assert.notEqual(wrong?.id, tenant.id);
  });
});
