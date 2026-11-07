import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createHmac } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { handlePspWebhook } from "@/lib/integrations/psp-webhook";
import {
  claimWebhookEvent,
  createTenant,
  updateConversation,
  updateTenant,
  getOrCreateConversation,
} from "@/lib/store/db";

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
  process.env.PSP_WEBHOOK_SECRET = "test-secret";
  await resetFileDb();
});

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL)) delete process.env[key];
  }
  Object.assign(process.env, ORIGINAL);
});

function sign(body: string): string {
  return createHmac("sha256", "test-secret").update(body).digest("hex");
}

describe("handlePspWebhook", () => {
  it("returns 401-equivalent for unsigned body", async () => {
    const result = await handlePspWebhook({
      rawBody: JSON.stringify({
        eventId: "e1",
        externalId: "missing",
        status: "active",
        kind: "billing",
      }),
      signatureHeader: null,
    });
    assert.deepEqual(result, { ok: false, error: "invalid_signature" });
  });

  it("activates subscription by externalId and ignores body tenantId", async () => {
    const tenant = await createTenant({
      businessName: "חנות",
      ownerName: "בעלים",
      phone: "0500000000",
      vertical: "other",
    });
    await updateTenant(tenant.id, {
      subscription: {
        ...tenant.subscription,
        status: "pending",
        externalId: "checkout_demo_1",
        provider: "demo",
      },
    });

    const body = JSON.stringify({
      eventId: "evt_billing_1",
      externalId: "checkout_demo_1",
      status: "active",
      kind: "billing",
      tenantId: "forged-tenant-id",
    });

    const result = await handlePspWebhook({
      rawBody: body,
      signatureHeader: sign(body),
    });
    assert.equal(result.ok, true);
    if (!result.ok || result.replay) throw new Error("expected apply");
    assert.equal(result.kind, "billing");
    assert.equal(result.status, "active");

    const replay = await handlePspWebhook({
      rawBody: body,
      signatureHeader: sign(body),
    });
    assert.deepEqual(replay, { ok: true, replay: true });
  });

  it("marks conversation paid by payment.externalId", async () => {
    const tenant = await createTenant({
      businessName: "חנות",
      ownerName: "בעלים",
      phone: "0500000001",
      vertical: "other",
    });
    const conversation = await getOrCreateConversation({
      tenantId: tenant.id,
      customerWaId: "972501111111",
      customerName: "לקוח",
    });
    await updateConversation(conversation.id, {
      payment: {
        linkUrl: "https://moked.local/demo-pay",
        status: "link_sent",
        provider: "demo",
        externalId: "pay_ext_1",
      },
      quote: { amountIls: 80, status: "accepted" },
    });

    const body = JSON.stringify({
      eventId: "evt_pay_1",
      externalId: "pay_ext_1",
      status: "paid",
      kind: "payment",
      amountIls: 80,
      conversationId: "forged",
    });

    const first = await handlePspWebhook({
      rawBody: body,
      signatureHeader: sign(body),
    });
    assert.equal(first.ok, true);
    if (!first.ok || first.replay) throw new Error("expected apply");
    assert.equal(first.status, "paid");

    const second = await handlePspWebhook({
      rawBody: body,
      signatureHeader: sign(body),
    });
    assert.deepEqual(second, { ok: true, replay: true });

    const claimedAgain = await claimWebhookEvent({
      id: "evt_pay_1",
      tenantId: tenant.id,
      payload: {},
    });
    assert.equal(claimedAgain, false);
  });
});
