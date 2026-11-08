import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { promises as fs } from "fs";
import path from "path";
import { handleBooking } from "@/lib/processes/waves/booking";
import { createTenant } from "@/lib/store/db";
import type { Conversation, Tenant } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

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

function conv(tenant: Tenant, patch: Partial<Conversation> = {}): Conversation {
  return {
    id: "c1",
    tenantId: tenant.id,
    customerWaId: "972500000000",
    status: "open",
    intent: "sales",
    processState: {},
    ...patch,
  };
}

describe("booking wave — appointment vs site visit", () => {
  it("appointments confirm without address; trades still ask for address", async () => {
    delete process.env.DATABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    await resetFileDb();

    const beauty = await createTenant({
      businessName: "סטודיו",
      ownerName: "נועה",
      phone: "0503333333",
      vertical: "beauty",
    });

    const propose = await handleBooking({
      tenant: beauty,
      conversation: conv(beauty, { activeProcess: "booking" }),
      inboundText: "לקבוע תור",
    });
    assert.equal(propose.events?.[0], "booking.proposed");
    assert.ok((propose.conversationPatch?.booking?.proposedSlots?.length ?? 0) > 0);

    const confirm = await handleBooking({
      tenant: beauty,
      conversation: conv(beauty, {
        activeProcess: "booking",
        booking: propose.conversationPatch?.booking,
        processState: propose.conversationPatch?.processState ?? {},
      }),
      inboundText: "1",
    });
    assert.ok(confirm.events?.includes("booking.confirmed"));
    assert.ok(confirm.events?.includes("wave_a.completed"));
    assert.match(confirm.replies[0]?.body ?? "", /התור נקבע/);
    assert.doesNotMatch(confirm.replies[0]?.body ?? "", /כתובת/);
    assert.equal(
      confirm.conversationPatch?.processState?.bookingStep,
      "done",
    );

    await resetFileDb();
    const trades = await createTenant({
      businessName: "אינסטלציה",
      ownerName: "דני",
      phone: "0504444444",
      vertical: "trades",
      tradeKind: "plumbing",
    });
    const tPropose = await handleBooking({
      tenant: trades,
      conversation: conv(trades, { activeProcess: "booking" }),
      inboundText: "ביקור",
    });
    const tConfirm = await handleBooking({
      tenant: trades,
      conversation: conv(trades, {
        activeProcess: "booking",
        booking: tPropose.conversationPatch?.booking,
        processState: tPropose.conversationPatch?.processState ?? {},
      }),
      inboundText: "1",
    });
    assert.equal(tConfirm.events?.[0], "booking.slot_chosen");
    assert.match(tConfirm.replies[0]?.body ?? "", /כתובת/);
    assert.equal(
      tConfirm.conversationPatch?.processState?.bookingStep,
      "address",
    );
  });
});
