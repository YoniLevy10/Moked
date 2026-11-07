import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { promises as fs } from "fs";
import path from "path";
import {
  escalateConversation,
  maybeRenotifyEscalation,
  resolveEscalation,
  takeoverConversation,
} from "@/lib/processes/escalation";
import {
  connectWhatsAppDemo,
  createTenant,
  getOrCreateConversation,
  getConversationById,
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

describe("escalation loop", () => {
  it("escalates once, notifies ≤2, resolve unpauses", async () => {
    const tenant = await createTenant({
      businessName: "עסק",
      ownerName: "בעלים",
      phone: "0505555555",
      vertical: "other",
    });
    await connectWhatsAppDemo(tenant.id);
    const fresh = await (
      await import("@/lib/store/db")
    ).getTenantById(tenant.id);
    assert.ok(fresh);

    const conversation = await getOrCreateConversation({
      tenantId: tenant.id,
      customerWaId: "972509999999",
      customerName: "לקוח",
    });

    const t0 = new Date("2026-01-01T10:00:00.000Z");
    const first = await escalateConversation({
      tenant: fresh!,
      conversation,
      reason: "person_requested",
      now: t0,
    });
    assert.ok(first?.escalation);
    assert.equal(first!.escalation!.attempts, 1);
    assert.ok(first!.escalation!.notifiedAt);

    const again = await escalateConversation({
      tenant: fresh!,
      conversation: first!,
      reason: "person_requested",
      now: new Date(t0.getTime() + 1000),
    });
    assert.equal(again, null);

    const early = await maybeRenotifyEscalation({
      tenant: fresh!,
      conversation: first!,
      now: new Date(t0.getTime() + 10 * 60 * 1000),
    });
    assert.equal(early, null);

    const second = await maybeRenotifyEscalation({
      tenant: fresh!,
      conversation: first!,
      now: new Date(t0.getTime() + 31 * 60 * 1000),
    });
    assert.equal(second!.escalation!.attempts, 2);

    const third = await maybeRenotifyEscalation({
      tenant: fresh!,
      conversation: second!,
      now: new Date(t0.getTime() + 70 * 60 * 1000),
    });
    assert.equal(third, null);

    const taken = await takeoverConversation(first!.id);
    assert.equal(taken.status, "human_takeover");

    const resolved = await resolveEscalation(first!.id, taken);
    assert.equal(resolved.status, "open");
    assert.ok(resolved.escalation?.resolvedAt);

    const stored = await getConversationById(first!.id);
    assert.equal(stored?.status, "open");
    assert.ok(stored?.escalation?.resolvedAt);
  });
});
