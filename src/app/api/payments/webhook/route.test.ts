import assert from "node:assert/strict";
import { createHmac } from "crypto";
import { afterEach, beforeEach, describe, it } from "node:test";
import { promises as fs } from "fs";
import path from "path";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/payments/webhook/route";
import {
  createTenant,
  getConversationById,
  getOrCreateConversation,
  updateConversation,
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
  delete process.env.PAYMENTS_WEBHOOK_SECRET;
  process.env.MOKED_ENABLE_CUSTOMER_PAYMENTS = "false";
  await resetFileDb();
});

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL)) delete process.env[key];
  }
  Object.assign(process.env, ORIGINAL);
});

function request(body: unknown, signature?: string | null) {
  const raw = JSON.stringify(body);
  const headers = new Headers({ "content-type": "application/json" });
  if (signature) headers.set("x-moked-signature", signature);
  return new NextRequest("http://localhost/api/payments/webhook", {
    method: "POST",
    headers,
    body: raw,
  });
}

describe("POST /api/payments/webhook", () => {
  it("returns 410 when customer payments are disabled", async () => {
    process.env.MOKED_ENABLE_CUSTOMER_PAYMENTS = "false";
    const res = await POST(request({ conversationId: "any" }));
    assert.equal(res.status, 410);
  });

  it("rejects unauthenticated POST — cannot flip payment to paid", async () => {
    process.env.MOKED_ENABLE_CUSTOMER_PAYMENTS = "true";
    process.env.PAYMENTS_WEBHOOK_SECRET = "pay-secret";

    const tenant = await createTenant({
      businessName: "עסק",
      ownerName: "בעלים",
      phone: "0501111111",
      vertical: "other",
    });
    const conversation = await getOrCreateConversation({
      tenantId: tenant.id,
      customerWaId: "972501111111",
    });
    await updateConversation(conversation.id, {
      payment: {
        linkUrl: "https://moked.local/demo-pay",
        status: "link_sent",
        provider: "demo",
      },
    });

    const forged = await POST(
      request({ conversationId: conversation.id, status: "paid" }, null),
    );
    assert.equal(forged.status, 401);

    const afterForge = await getConversationById(conversation.id);
    assert.equal(afterForge?.payment?.status, "link_sent");

    const raw = JSON.stringify({
      conversationId: conversation.id,
      status: "paid",
      amountIls: 100,
    });
    const sig = createHmac("sha256", "pay-secret").update(raw).digest("hex");
    const ok = await POST(
      new NextRequest("http://localhost/api/payments/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-moked-signature": sig,
        },
        body: raw,
      }),
    );
    assert.equal(ok.status, 200);
    const paid = await getConversationById(conversation.id);
    assert.equal(paid?.payment?.status, "paid");
  });
});
