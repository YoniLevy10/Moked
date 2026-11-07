import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { createHmac } from "crypto";
import {
  DemoPspClient,
  providerMode,
  signPspWebhook,
} from "@/lib/integrations/psp";
import { getPsp } from "@/lib/integrations/get-psp";
import { TranzilaClient } from "@/lib/integrations/tranzila";

const ORIGINAL = { ...process.env };

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL)) delete process.env[key];
  }
  Object.assign(process.env, ORIGINAL);
});

describe("DemoPspClient", () => {
  it("creates deterministic hosted charge without network", async () => {
    process.env.MOKED_PROVIDER_MODE = "demo";
    const client = new DemoPspClient();
    const charge = await client.createHostedCharge({
      amountIls: 120,
      description: "test",
      tenantId: "tenant_1",
      conversationId: "conv_1",
    });
    assert.equal(charge.provider, "demo");
    assert.match(charge.hostedUrl, /^https:\/\/moked\.local\/demo-pay/);
    assert.match(charge.externalId, /^demo_conv_1_/);
  });

  it("charges token offline", async () => {
    const client = new DemoPspClient();
    const result = await client.chargeToken({
      token: "tok_demo",
      amountIls: 10,
      description: "tok",
      tenantId: "t1",
    });
    assert.equal(result.success, true);
    assert.equal(result.provider, "demo");
  });

  it("rejects unsigned webhook", () => {
    process.env.PSP_WEBHOOK_SECRET = "secret";
    const client = new DemoPspClient();
    const body = JSON.stringify({
      eventId: "e1",
      externalId: "x1",
      status: "paid",
      kind: "payment",
    });
    assert.equal(client.verifyWebhook(body, null), null);
  });

  it("accepts HMAC-signed webhook", () => {
    process.env.PSP_WEBHOOK_SECRET = "secret";
    const client = new DemoPspClient();
    const body = JSON.stringify({
      eventId: "e1",
      externalId: "x1",
      status: "active",
      kind: "billing",
    });
    const sig = createHmac("sha256", "secret").update(body).digest("hex");
    const verified = client.verifyWebhook(body, sig);
    assert.ok(verified);
    assert.equal(verified?.externalId, "x1");
    assert.equal(verified?.status, "active");
  });
});

describe("getPsp factory", () => {
  it("returns DemoPspClient by default", () => {
    delete process.env.MOKED_PROVIDER_MODE;
    assert.ok(getPsp() instanceof DemoPspClient);
    assert.equal(providerMode(), "demo");
  });

  it("returns TranzilaClient when live + tranzila", () => {
    process.env.MOKED_PROVIDER_MODE = "live";
    process.env.MOKED_BILLING_PROVIDER = "tranzila";
    assert.ok(getPsp() instanceof TranzilaClient);
  });

  it("throws for unimplemented live adapters", () => {
    process.env.MOKED_PROVIDER_MODE = "live";
    process.env.MOKED_BILLING_PROVIDER = "grow";
    assert.throws(() => getPsp(), /psp_adapter_unavailable:grow/);
  });
});

describe("TranzilaClient (mocked live charge)", () => {
  it("createHostedCharge posts handshake and builds hosted URL", async () => {
    process.env.TRANZILA_API_URL = "https://api.tranzila.test";
    process.env.TRANZILA_TERMINAL = "term1";
    process.env.TRANZILA_API_KEY = "key1";
    process.env.TRANZILA_HOSTED_BASE_URL = "https://direct.tranzila.test";

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({ thtk: "handshake-token", transaction_id: "tx_99" }),
        { status: 200 },
      )) as typeof fetch;

    try {
      const client = new TranzilaClient();
      const charge = await client.createHostedCharge({
        amountIls: 249,
        description: "sub",
        tenantId: "tenant_live",
      });
      assert.equal(charge.provider, "tranzila");
      assert.equal(charge.externalId, "tx_99");
      assert.match(charge.hostedUrl, /handshake-token/);
      assert.match(charge.hostedUrl, /term1/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("signPspWebhook", () => {
  it("signs with PSP_WEBHOOK_SECRET", () => {
    process.env.PSP_WEBHOOK_SECRET = "abc";
    const body = '{"a":1}';
    assert.equal(
      signPspWebhook(body),
      createHmac("sha256", "abc").update(body).digest("hex"),
    );
  });
});
