import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { handlePayment } from "@/lib/processes/waves/payment";
import type { ProcessContext } from "@/lib/processes/types";
import type { Conversation, Tenant } from "@/lib/types";

const ORIGINAL = process.env.MOKED_ENABLE_CUSTOMER_PAYMENTS;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.MOKED_ENABLE_CUSTOMER_PAYMENTS;
  else process.env.MOKED_ENABLE_CUSTOMER_PAYMENTS = ORIGINAL;
});

function ctx(overrides?: {
  inboundText?: string;
  paymentStatus?: NonNullable<Conversation["payment"]>["status"];
}): ProcessContext {
  const tenant = {
    id: "t1",
    pricing: [{ id: "p1", name: "ביקור", priceIls: 250 }],
    integrations: { paymentsProvider: "demo", invoicingProvider: "none" },
    whatsapp: { mode: "demo", connected: true },
    processes: { payment: { enabled: true, config: {} } },
  } as unknown as Tenant;

  const conversation = {
    id: "c1",
    tenantId: "t1",
    payment: {
      linkUrl: "https://moked.local/demo-pay",
      status: overrides?.paymentStatus ?? "link_sent",
      provider: "demo",
    },
    quote: { amountIls: 250, status: "sent" },
    processState: {},
  } as unknown as Conversation;

  return {
    tenant,
    conversation,
    inboundText: overrides?.inboundText ?? "שילמתי",
  };
}

describe("payment wave — customer paid claim", () => {
  it("does not mark paid from שילמתי without PSP proof", () => {
    process.env.MOKED_ENABLE_CUSTOMER_PAYMENTS = "true";
    const result = handlePayment(ctx({ inboundText: "שילמתי" }));
    assert.equal(result.handled, true);
    assert.equal(result.conversationPatch?.payment?.status, undefined);
    assert.ok(!(result.events ?? []).includes("payment.paid"));
    assert.ok((result.events ?? []).includes("payment.pending_verification"));
    assert.match(result.replies[0]?.body ?? "", /סליקה|יאומת/);
  });

  it("stays parked when customer payments flag is off", () => {
    process.env.MOKED_ENABLE_CUSTOMER_PAYMENTS = "false";
    const result = handlePayment(ctx());
    assert.ok((result.events ?? []).includes("payment.blocked_no_provider"));
  });
});
