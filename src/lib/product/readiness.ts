import { MessageTemplate, Tenant } from "@/lib/types";
import { getTenantById, listTemplatesForTenant } from "@/lib/store/db";
import { getWhatsAppToken, isLiveWhatsApp } from "@/lib/whatsapp/client";
import { META_GRAPH_BASE } from "@/lib/whatsapp/graph";
import {
  isAppSubscribedToWaba,
  listWabaSubscribedApps,
} from "@/lib/whatsapp/meta-oauth";

export type ReadinessCheckId =
  | "whatsapp_connected"
  | "meta_creds_configured"
  | "subscription_active"
  | "bot_instructions_approved"
  | "templates_approved"
  | "token_valid"
  | "phone_registered"
  | "webhook_subscribed"
  | "display_name_approved"
  | "live_channel_not_simulated";

export type ReadinessCheck = {
  id: ReadinessCheckId;
  labelHe: string;
  ok: boolean;
  blocking: boolean;
  fixHref: string;
  detail?: string;
};

export type ReadinessReport = {
  tenantId: string;
  /** Ready for the evaluated mode (demo-relaxed or live). */
  ready: boolean;
  /**
   * Live Meta channel ready — all live blocking probes green.
   * Never true from live-test / engine simulation / demo connect alone.
   */
  liveReady: boolean;
  /** Demo path ready (no Graph probes required). */
  demoReady: boolean;
  mode: "demo" | "live";
  checkedAt: string;
  checks: ReadinessCheck[];
};

/**
 * Demo relaxed rules:
 * - Skip live Graph probes (token / webhook / display name / phone register)
 * - Never fail-closed on missing Meta number in demo
 * - Still require: whatsapp_connected, subscription_active, bot_instructions_approved
 * - templates_approved only when reminders/retention are enabled
 *
 * Live mode runs full Graph checks. Phone GET proves token + display name only;
 * webhook_subscribed requires WABA subscribed_apps evidence for META_APP_ID.
 * liveReady is never set from live-test/engine simulation alone.
 *
 * Unit tests must not require network in demo; live tests mock fetch.
 */

const cache = new Map<string, { expires: number; report: ReadinessReport }>();
const CACHE_MS = 5 * 60 * 1000;

/** WhatsApp / Meta provider mode (independent of SaaS billingMode). */
export function providerMode(): "demo" | "live" {
  return process.env.MOKED_PROVIDER_MODE?.trim() === "live" ? "live" : "demo";
}

export function bustReadinessCache(tenantId: string): void {
  cache.delete(tenantId);
}

function templatesRequired(tenant: Tenant): boolean {
  return Boolean(
    tenant.processes.reminders?.enabled || tenant.processes.retention?.enabled,
  );
}

function templatesOk(templates: MessageTemplate[], tenant: Tenant): boolean {
  if (!templatesRequired(tenant)) return true;
  const needed = ["booking_confirm", "reminder_t24"];
  return needed.every((name) =>
    templates.some((t) => t.name === name && t.status === "approved"),
  );
}

export function metaCredsConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return Boolean(
    env.META_APP_ID?.trim() &&
      env.META_APP_SECRET?.trim() &&
      env.META_EMBEDDED_SIGNUP_CONFIG_ID?.trim() &&
      env.META_WEBHOOK_VERIFY_TOKEN?.trim(),
  );
}

function isSimulatedWhatsApp(tenant: Tenant): boolean {
  const id = tenant.whatsapp.phoneNumberId ?? "";
  return (
    tenant.whatsapp.mode === "demo" ||
    id.startsWith("demo_") ||
    !tenant.whatsapp.accessToken
  );
}

async function probePhoneNode(tenant: Tenant): Promise<{
  tokenValid: boolean;
  displayNameApproved: boolean;
  phoneRegistered: boolean;
  detail?: string;
  registerDetail?: string;
}> {
  const token = getWhatsAppToken(tenant);
  const phoneNumberId = tenant.whatsapp.phoneNumberId;
  if (!token || !phoneNumberId) {
    return {
      tokenValid: false,
      displayNameApproved: false,
      phoneRegistered: false,
      detail: "missing_token_or_phone",
      registerDetail: "missing_token_or_phone",
    };
  }
  try {
    const res = await fetch(
      `${META_GRAPH_BASE}/${phoneNumberId}?fields=display_phone_number,verified_name,name_status,quality_rating,status,code_verification_status`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) {
      return {
        tokenValid: false,
        displayNameApproved: false,
        phoneRegistered: false,
        detail: `graph_${res.status}`,
        registerDetail: `graph_${res.status}`,
      };
    }
    const data = (await res.json()) as {
      name_status?: string;
      verified_name?: string;
      status?: string;
      code_verification_status?: string;
    };
    // verified_name alone must not green-light — require APPROVED name_status.
    const displayNameApproved = data.name_status === "APPROVED";
    // Cloud API usable when status is CONNECTED (registered).
    const phoneRegistered =
      typeof data.status === "string"
        ? data.status.toUpperCase() === "CONNECTED"
        : true; // older Graph responses may omit status — token GET success is weak evidence
    return {
      tokenValid: true,
      displayNameApproved,
      phoneRegistered,
      detail: displayNameApproved
        ? undefined
        : `name_status_${data.name_status ?? "missing"}`,
      registerDetail: phoneRegistered
        ? undefined
        : `phone_status_${data.status ?? "missing"}`,
    };
  } catch (error) {
    return {
      tokenValid: false,
      displayNameApproved: false,
      phoneRegistered: false,
      detail: error instanceof Error ? error.message : "graph_error",
      registerDetail: error instanceof Error ? error.message : "graph_error",
    };
  }
}

async function probeWebhookSubscription(tenant: Tenant): Promise<{
  webhookSubscribed: boolean;
  detail?: string;
}> {
  const token = getWhatsAppToken(tenant);
  const wabaId = tenant.whatsapp.wabaId;
  if (!token || !wabaId) {
    return {
      webhookSubscribed: false,
      detail: "missing_token_or_waba",
    };
  }
  const appId = process.env.META_APP_ID?.trim();
  if (!appId) {
    return {
      webhookSubscribed: false,
      detail: "missing_meta_app_id",
    };
  }
  const listed = await listWabaSubscribedApps(wabaId, token);
  if (!listed.ok) {
    return {
      webhookSubscribed: false,
      detail: listed.detail ?? "subscribed_apps_failed",
    };
  }
  const subscribed = isAppSubscribedToWaba(listed.apps, appId);
  return {
    webhookSubscribed: subscribed,
    detail: subscribed
      ? undefined
      : listed.apps.length === 0
        ? "no_subscribed_apps"
        : "app_not_in_subscribed_apps",
  };
}

function computeReady(checks: ReadinessCheck[]): boolean {
  return checks.every((c) => !c.blocking || c.ok);
}

export async function evaluateReadiness(
  tenantId: string,
  options?: { bypassCache?: boolean; forceLive?: boolean },
): Promise<ReadinessReport> {
  if (!options?.bypassCache && !options?.forceLive) {
    const hit = cache.get(tenantId);
    if (hit && hit.expires > Date.now()) return hit.report;
  }

  const tenant = await getTenantById(tenantId);
  if (!tenant) throw new Error("tenant_not_found");

  const mode = options?.forceLive ? "live" : providerMode();
  const templates = await listTemplatesForTenant(tenantId);
  const checks: ReadinessCheck[] = [];

  checks.push({
    id: "whatsapp_connected",
    labelHe: "WhatsApp מחובר",
    ok: tenant.whatsapp.connected === true,
    blocking: true,
    fixHref: "/dashboard/connections",
  });

  checks.push({
    id: "subscription_active",
    labelHe: "מנוי פעיל",
    ok: tenant.subscription.status === "active",
    blocking: true,
    fixHref: "/dashboard/bot",
  });

  checks.push({
    id: "bot_instructions_approved",
    labelHe: "הוראות בוט מאושרות",
    ok: Boolean(tenant.bot.approved),
    blocking: true,
    fixHref: "/dashboard/bot",
  });

  const needTemplates = templatesRequired(tenant);
  checks.push({
    id: "templates_approved",
    labelHe: "תבניות מאושרות",
    ok: templatesOk(templates, tenant),
    blocking: needTemplates,
    fixHref: "/dashboard/connections#templates",
    detail: needTemplates
      ? "נדרש כשתזכורות/שימור מופעלים — שלחו תבניות לאישור בחיבורים"
      : "לא חוסם — תהליכי תבנית כבויים",
  });

  // Demo baseline (used for demoReady even when evaluating live).
  const demoChecks = [...checks];
  const demoReady = computeReady(demoChecks);

  if (mode === "live") {
    const credsOk = metaCredsConfigured();
    checks.push({
      id: "meta_creds_configured",
      labelHe: "משתני Meta מוגדרים",
      ok: credsOk,
      blocking: true,
      fixHref: "/dashboard/connections",
      detail: credsOk
        ? undefined
        : "חסרים META_APP_ID / META_APP_SECRET / META_EMBEDDED_SIGNUP_CONFIG_ID / META_WEBHOOK_VERIFY_TOKEN",
    });

    const simulated = isSimulatedWhatsApp(tenant);
    checks.push({
      id: "live_channel_not_simulated",
      labelHe: "ערוץ חי (לא סימולציה)",
      ok: !simulated && tenant.whatsapp.mode === "live",
      blocking: true,
      fixHref: "/dashboard/connections",
      detail: simulated
        ? "live-test / demo connect אינו LIVE_READY — יש להשלים Embedded Signup חי"
        : undefined,
    });

    const [phone, webhook] = await Promise.all([
      probePhoneNode(tenant),
      probeWebhookSubscription(tenant),
    ]);
    checks.push({
      id: "token_valid",
      labelHe: "טוקן Meta תקף",
      ok: phone.tokenValid && isLiveWhatsApp(tenant),
      blocking: true,
      fixHref: "/dashboard/connections",
      detail: phone.detail,
    });
    checks.push({
      id: "phone_registered",
      labelHe: "מספר רשום ב-Cloud API",
      ok: phone.phoneRegistered && phone.tokenValid,
      blocking: true,
      fixHref: "/dashboard/connections",
      detail: phone.registerDetail,
    });
    checks.push({
      id: "webhook_subscribed",
      labelHe: "Webhook רשום (subscribed_apps)",
      ok: webhook.webhookSubscribed,
      blocking: true,
      fixHref: "/dashboard/connections",
      detail: webhook.detail,
    });
    checks.push({
      id: "display_name_approved",
      labelHe: "שם תצוגה מאושר (APPROVED)",
      ok: phone.displayNameApproved,
      blocking: true,
      fixHref: "/dashboard/connections",
      detail: phone.detail,
    });
  }

  const ready = computeReady(checks);
  const liveReady = mode === "live" && ready;
  const report: ReadinessReport = {
    tenantId,
    ready,
    liveReady,
    demoReady,
    mode,
    checkedAt: new Date().toISOString(),
    checks,
  };
  // Only cache demo/provider-mode reports — go-live forceLive must stay fresh.
  if (!options?.forceLive) {
    cache.set(tenantId, { expires: Date.now() + CACHE_MS, report });
  }
  return report;
}

export function blockingFailures(report: ReadinessReport): ReadinessCheck[] {
  return report.checks.filter((c) => c.blocking && !c.ok);
}
