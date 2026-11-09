/**
 * Central Meta Graph / Embedded Signup version constants.
 *
 * Inventory before this module (main @ c82a01a): every call site hardcoded
 * `https://graph.facebook.com/v21.0` in:
 * - src/lib/whatsapp/client.ts
 * - src/lib/whatsapp/meta-oauth.ts
 * - src/lib/product/meta.ts
 * - src/lib/product/readiness.ts
 * - src/lib/templates/meta-graph.ts
 * - EmbeddedSignupButton FB.init fallback
 *
 * Upgrade path (compatible, not blind replace):
 * 1. Bump META_GRAPH_VERSION here only after mocking + staging smoke for
 *    oauth exchange, phone register, subscribed_apps, send text, templates.
 * 2. Keep META_EMBEDDED_SIGNUP_VERSION on v4 (v2/v3 deprecated Oct 15 2026).
 * 3. Do not change FB Login for Business config ID via code — owner recreates
 *    Meta dashboard config for product selection on v4.
 */
export const META_GRAPH_VERSION = "v21.0";
export const META_GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

/** Embedded Signup launch `extras.version`. Prefer v4; omit sessionInfoVersion. */
export const META_EMBEDDED_SIGNUP_VERSION = "v4";
