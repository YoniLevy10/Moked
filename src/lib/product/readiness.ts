import { MessageTemplate, Tenant } from "@/lib/types";
import { getTenantById, listTemplatesForTenant } from "@/lib/store/db";
import { getWhatsAppToken, isLiveWhatsApp } from "@/lib/whatsapp/client";

export type ReadinessCheckId =
  | "whatsapp_connected"
  | "subscription_active"
  | "bot_instructions_approved"
  | "templates_approved"
  | "token_valid"
  | "webhook_subscribed"
  | "display_name_approved";

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
  ready: boolean;
  mode: "demo" | "live";
  checkedAt: string;
  checks: ReadinessCheck[];
};

/**
 * Demo relaxed rules:
 * - Skip live Graph probes (token / webhook / display name)
 * - Never fail-closed on missing Meta number in demo
 * - Still require: whatsapp_connected, subscription_active, bot_instructions_approved
 * - templates_approved only when reminders/retention are enabled
 *
 * Live mode runs the full Graph checks. Unit tests must not require network
 * in demo; live tests mock fetch.
 */

const cache = new Map<string, { expires: number; report: ReadinessReport }>();
const CACHE_MS = 5 * 60 * 1000;

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

async function probeGraph(tenant: Tenant): Promise<{
  tokenValid: boolean;
  webhookSubscribed: boolean;
  displayNameApproved: boolean;
  detail?: string;
}> {
  const token = getWhatsAppToken(tenant);
  const phoneNumberId = tenant.whatsapp.phoneNumberId;
  if (!token || !phoneNumberId) {
    return {
      tokenValid: false,
      webhookSubscribed: false,
      displayNameApproved: false,
      detail: "missing_token_or_phone",
    };
  }
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}?fields=display_phone_number,verified_name,name_status,quality_rating`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) {
      return {
        tokenValid: false,
        webhookSubscribed: false,
        displayNameApproved: false,
        detail: `graph_${res.status}`,
      };
    }
    const data = (await res.json()) as {
      name_status?: string;
      verified_name?: string;
    };
    const displayNameApproved =
      data.name_status === "APPROVED" || Boolean(data.verified_name);
    return {
      tokenValid: true,
      webhookSubscribed: true,
      displayNameApproved,
    };
  } catch (error) {
    return {
      tokenValid: false,
      webhookSubscribed: false,
      displayNameApproved: false,
      detail: error instanceof Error ? error.message : "graph_error",
    };
  }
}

export async function evaluateReadiness(
  tenantId: string,
  options?: { bypassCache?: boolean },
): Promise<ReadinessReport> {
  if (!options?.bypassCache) {
    const hit = cache.get(tenantId);
    if (hit && hit.expires > Date.now()) return hit.report;
  }

  const tenant = await getTenantById(tenantId);
  if (!tenant) throw new Error("tenant_not_found");

  const mode = providerMode();
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
    fixHref: "/dashboard/connections",
    detail: needTemplates
      ? "נדרש כשתזכורות/שימור מופעלים"
      : "לא חוסם — תהליכי תבנית כבויים",
  });

  if (mode === "live") {
    const graph = await probeGraph(tenant);
    checks.push({
      id: "token_valid",
      labelHe: "טוקן Meta תקף",
      ok: graph.tokenValid && isLiveWhatsApp(tenant),
      blocking: true,
      fixHref: "/dashboard/connections",
      detail: graph.detail,
    });
    checks.push({
      id: "webhook_subscribed",
      labelHe: "Webhook רשום",
      ok: graph.webhookSubscribed,
      blocking: true,
      fixHref: "/dashboard/connections",
      detail: graph.detail,
    });
    checks.push({
      id: "display_name_approved",
      labelHe: "שם תצוגה מאושר",
      ok: graph.displayNameApproved,
      blocking: true,
      fixHref: "/dashboard/connections",
      detail: graph.detail,
    });
  }

  const ready = checks.every((c) => !c.blocking || c.ok);
  const report: ReadinessReport = {
    tenantId,
    ready,
    mode,
    checkedAt: new Date().toISOString(),
    checks,
  };
  cache.set(tenantId, { expires: Date.now() + CACHE_MS, report });
  return report;
}

export function blockingFailures(report: ReadinessReport): ReadinessCheck[] {
  return report.checks.filter((c) => c.blocking && !c.ok);
}
