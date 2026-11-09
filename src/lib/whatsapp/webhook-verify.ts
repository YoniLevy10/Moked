/**
 * Meta webhook GET verify-token helpers.
 * Production requires an explicit META_WEBHOOK_VERIFY_TOKEN — never the
 * historic insecure default. Dev may fall back only when NODE_ENV !== production.
 */

export const DEV_WEBHOOK_VERIFY_FALLBACK = "moked_dev_verify_token";

export type WebhookVerifyTokenResult =
  | { ok: true; token: string; source: "env" | "dev_fallback" }
  | { ok: false; reason: "missing_in_production" | "empty" };

export function resolveWebhookVerifyToken(
  env: NodeJS.ProcessEnv = process.env,
): WebhookVerifyTokenResult {
  const configured = env.META_WEBHOOK_VERIFY_TOKEN?.trim();
  if (configured) {
    if (configured === DEV_WEBHOOK_VERIFY_FALLBACK && env.NODE_ENV === "production") {
      // Explicitly set to the known-insecure default in prod is still a misconfig —
      // refuse so Meta cannot verify against a public default.
      return { ok: false, reason: "missing_in_production" };
    }
    return { ok: true, token: configured, source: "env" };
  }
  if (env.NODE_ENV === "production") {
    return { ok: false, reason: "missing_in_production" };
  }
  return {
    ok: true,
    token: DEV_WEBHOOK_VERIFY_FALLBACK,
    source: "dev_fallback",
  };
}
