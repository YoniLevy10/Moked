import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { promises as fs } from "fs";
import path from "path";
import {
  parseInboundMessages,
  parseStatusUpdates,
  parseTemplateStatusUpdates,
  webhookIdempotencyKey,
} from "@/lib/whatsapp/webhook";
import { verifyMetaSignature } from "@/lib/whatsapp/client";
import {
  addMessage,
  applyTemplateStatusUpdate,
  claimWebhookEvent,
  createTenant,
  getOrCreateConversation,
  updateMessageDeliveryByMetaId,
} from "@/lib/store/db";
import { createHmac } from "crypto";

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
  delete process.env.META_APP_SECRET;
  delete process.env.MOKED_META_SIGNATURE_BYPASS;
  process.env.MOKED_PROVIDER_MODE = "demo";
  await resetFileDb();
});

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL)) delete process.env[key];
  }
  Object.assign(process.env, ORIGINAL);
});

const deliveredFixture = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "WABA1",
      changes: [
        {
          field: "messages",
          value: {
            metadata: { phone_number_id: "PN1" },
            statuses: [
              {
                id: "wamid.OUT1",
                status: "delivered",
                timestamp: "1700000000",
              },
            ],
          },
        },
      ],
    },
  ],
};

const failedFixture = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "WABA1",
      changes: [
        {
          field: "messages",
          value: {
            metadata: { phone_number_id: "PN1" },
            statuses: [
              {
                id: "wamid.OUT1",
                status: "failed",
                timestamp: "1700000001",
                errors: [{ code: 131026, title: "Message undeliverable" }],
              },
            ],
          },
        },
      ],
    },
  ],
};

const templateRejectedFixture = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "WABA1",
      changes: [
        {
          field: "message_template_status_update",
          value: {
            metadata: { phone_number_id: "PN1" },
            message_template_status_update: {
              event: "REJECTED",
              message_template_id: "111",
              message_template_name: "booking_confirm",
              message_template_language: "he",
              reason: "INVALID_FORMAT",
            },
          },
        },
      ],
    },
  ],
};

describe("Meta webhook parsers", () => {
  it("parses delivered status", () => {
    const statuses = parseStatusUpdates(deliveredFixture);
    assert.equal(statuses.length, 1);
    assert.equal(statuses[0].status, "delivered");
    assert.equal(statuses[0].metaMessageId, "wamid.OUT1");
  });

  it("parses failed status with error code", () => {
    const statuses = parseStatusUpdates(failedFixture);
    assert.equal(statuses[0].status, "failed");
    assert.equal(statuses[0].errorCode, "131026");
  });

  it("parses template rejected", () => {
    const updates = parseTemplateStatusUpdates(templateRejectedFixture);
    assert.equal(updates.length, 1);
    assert.equal(updates[0].event, "REJECTED");
    assert.equal(updates[0].name, "booking_confirm");
  });

  it("still parses inbound text", () => {
    const inbound = parseInboundMessages({
      entry: [
        {
          id: "E1",
          changes: [
            {
              value: {
                metadata: { phone_number_id: "PN1" },
                contacts: [{ wa_id: "97250", profile: { name: "א" } }],
                messages: [
                  {
                    from: "97250",
                    id: "wamid.IN1",
                    type: "text",
                    text: { body: "שלום" },
                  },
                ],
              },
            },
          ],
        },
      ],
    });
    assert.equal(inbound[0].text, "שלום");
  });
});

describe("verifyMetaSignature", () => {
  it("fail-closed in live without secret", () => {
    process.env.MOKED_PROVIDER_MODE = "live";
    delete process.env.META_APP_SECRET;
    assert.equal(verifyMetaSignature("{}", null), false);
  });

  it("allows explicit bypass", () => {
    process.env.MOKED_PROVIDER_MODE = "live";
    process.env.MOKED_META_SIGNATURE_BYPASS = "1";
    assert.equal(verifyMetaSignature("{}", null), true);
  });

  it("validates hmac when secret set", () => {
    process.env.META_APP_SECRET = "meta-secret";
    const body = '{"ok":true}';
    const dig = createHmac("sha256", "meta-secret").update(body).digest("hex");
    assert.equal(verifyMetaSignature(body, `sha256=${dig}`), true);
    assert.equal(verifyMetaSignature(body, "sha256=deadbeef"), false);
  });
});

describe("status + template persistence", () => {
  it("duplicate status fixture claims once", async () => {
    const tenant = await createTenant({
      businessName: "עסק",
      ownerName: "בעלים",
      phone: "0501234567",
      vertical: "other",
    });
    const conversation = await getOrCreateConversation({
      tenantId: tenant.id,
      customerWaId: "972501234567",
    });
    await addMessage({
      conversationId: conversation.id,
      tenantId: tenant.id,
      direction: "outbound",
      body: "שלום",
      type: "text",
      metaMessageId: "wamid.OUT1",
    });

    const statuses = parseStatusUpdates(deliveredFixture);
    const key = webhookIdempotencyKey(
      statuses[0].entryId,
      `status:${statuses[0].metaMessageId}:${statuses[0].status}`,
    );
    const first = await claimWebhookEvent({
      id: key,
      tenantId: tenant.id,
      payload: {},
    });
    const second = await claimWebhookEvent({
      id: key,
      tenantId: tenant.id,
      payload: {},
    });
    assert.equal(first, true);
    assert.equal(second, false);

    const updated = await updateMessageDeliveryByMetaId({
      metaMessageId: "wamid.OUT1",
      deliveredAt: new Date().toISOString(),
    });
    assert.ok(updated?.deliveredAt);

    const rejected = await applyTemplateStatusUpdate({
      tenantId: tenant.id,
      metaId: "111",
      name: "booking_confirm",
      language: "he",
      event: "REJECTED",
      reason: "INVALID_FORMAT",
    });
    assert.equal(rejected.status, "rejected");
    assert.equal(rejected.rejectionReason, "INVALID_FORMAT");

    const again = await applyTemplateStatusUpdate({
      tenantId: tenant.id,
      metaId: "111",
      name: "booking_confirm",
      language: "he",
      event: "REJECTED",
      reason: "INVALID_FORMAT",
    });
    assert.equal(again.id, rejected.id);
  });
});
