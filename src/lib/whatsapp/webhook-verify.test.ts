import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEV_WEBHOOK_VERIFY_FALLBACK,
  resolveWebhookVerifyToken,
} from "@/lib/whatsapp/webhook-verify";

describe("resolveWebhookVerifyToken", () => {
  it("requires explicit token in production", () => {
    const result = resolveWebhookVerifyToken({
      NODE_ENV: "production",
    } as NodeJS.ProcessEnv);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "missing_in_production");
  });

  it("refuses insecure default even when explicitly set in production", () => {
    const result = resolveWebhookVerifyToken({
      NODE_ENV: "production",
      META_WEBHOOK_VERIFY_TOKEN: DEV_WEBHOOK_VERIFY_FALLBACK,
    } as NodeJS.ProcessEnv);
    assert.equal(result.ok, false);
  });

  it("accepts explicit non-default token in production", () => {
    const result = resolveWebhookVerifyToken({
      NODE_ENV: "production",
      META_WEBHOOK_VERIFY_TOKEN: "prod_verify_secret_9f2a",
    } as NodeJS.ProcessEnv);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.token, "prod_verify_secret_9f2a");
      assert.equal(result.source, "env");
    }
  });

  it("allows insecure fallback only outside production", () => {
    const result = resolveWebhookVerifyToken({
      NODE_ENV: "development",
    } as NodeJS.ProcessEnv);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.token, DEV_WEBHOOK_VERIFY_FALLBACK);
      assert.equal(result.source, "dev_fallback");
    }
  });
});
