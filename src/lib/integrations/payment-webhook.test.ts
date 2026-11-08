import assert from "node:assert/strict";
import { createHmac } from "crypto";
import { afterEach, describe, it } from "node:test";
import {
  paymentsWebhookSecret,
  verifyPaymentsSignature,
} from "@/lib/integrations/payment-webhook";

const ORIGINAL_SECRET = process.env.PAYMENTS_WEBHOOK_SECRET;

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.PAYMENTS_WEBHOOK_SECRET;
  else process.env.PAYMENTS_WEBHOOK_SECRET = ORIGINAL_SECRET;
});

describe("payments webhook signature", () => {
  it("fails closed without secret or header", () => {
    delete process.env.PAYMENTS_WEBHOOK_SECRET;
    assert.equal(paymentsWebhookSecret(), null);
    assert.equal(verifyPaymentsSignature("{}", "abc"), false);

    process.env.PAYMENTS_WEBHOOK_SECRET = "test-secret";
    assert.equal(verifyPaymentsSignature("{}", null), false);
  });

  it("accepts matching hmac hex of raw body", () => {
    process.env.PAYMENTS_WEBHOOK_SECRET = "test-secret";
    const raw = JSON.stringify({ conversationId: "c1", status: "paid" });
    const sig = createHmac("sha256", "test-secret").update(raw).digest("hex");
    assert.equal(verifyPaymentsSignature(raw, sig), true);
    assert.equal(verifyPaymentsSignature(raw, "deadbeef"), false);
    assert.equal(verifyPaymentsSignature(raw + "x", sig), false);
  });
});
