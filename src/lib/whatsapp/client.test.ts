import assert from "node:assert/strict";
import { createHmac } from "crypto";
import { afterEach, describe, it } from "node:test";
import { verifyMetaSignature } from "@/lib/whatsapp/client";

const KEYS = [
  "MOKED_META_SIGNATURE_BYPASS",
  "META_APP_SECRET",
  "MOKED_PROVIDER_MODE",
  "NODE_ENV",
] as const;

const ORIGINAL: Record<string, string | undefined> = {};
for (const key of KEYS) ORIGINAL[key] = process.env[key];

afterEach(() => {
  for (const key of KEYS) {
    if (ORIGINAL[key] === undefined) delete process.env[key];
    else process.env[key] = ORIGINAL[key];
  }
});

function sign(raw: string, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
}

describe("verifyMetaSignature", () => {
  it("rejects unsigned when META_APP_SECRET missing (no soft-open)", () => {
    delete process.env.MOKED_META_SIGNATURE_BYPASS;
    delete process.env.META_APP_SECRET;
    process.env.MOKED_PROVIDER_MODE = "demo";
    process.env.NODE_ENV = "development";
    assert.equal(verifyMetaSignature("{}", null), false);
    assert.equal(verifyMetaSignature("{}", "sha256=abc"), false);
  });

  it("rejects unsigned in production even with bypass", () => {
    process.env.MOKED_META_SIGNATURE_BYPASS = "1";
    delete process.env.META_APP_SECRET;
    process.env.NODE_ENV = "production";
    process.env.MOKED_PROVIDER_MODE = "demo";
    assert.equal(verifyMetaSignature("{}", null), false);
  });

  it("rejects unsigned when a live WhatsApp tenant exists even with bypass", () => {
    process.env.MOKED_META_SIGNATURE_BYPASS = "1";
    delete process.env.META_APP_SECRET;
    process.env.NODE_ENV = "development";
    process.env.MOKED_PROVIDER_MODE = "demo";
    assert.equal(
      verifyMetaSignature("{}", null, { hasLiveWhatsAppTenant: true }),
      false,
    );
  });

  it("allows explicit local bypass only when no live traffic is possible", () => {
    process.env.MOKED_META_SIGNATURE_BYPASS = "1";
    delete process.env.META_APP_SECRET;
    process.env.NODE_ENV = "development";
    process.env.MOKED_PROVIDER_MODE = "demo";
    assert.equal(
      verifyMetaSignature("{}", null, { hasLiveWhatsAppTenant: false }),
      true,
    );
  });

  it("verifies hmac when secret is set", () => {
    delete process.env.MOKED_META_SIGNATURE_BYPASS;
    process.env.META_APP_SECRET = "meta-secret";
    process.env.MOKED_PROVIDER_MODE = "live";
    process.env.NODE_ENV = "production";
    const raw = '{"object":"whatsapp_business_account"}';
    assert.equal(verifyMetaSignature(raw, sign(raw, "meta-secret")), true);
    assert.equal(verifyMetaSignature(raw, null), false);
    assert.equal(verifyMetaSignature(raw, sign(raw, "wrong")), false);
  });
});
