import { createHmac, timingSafeEqual } from "crypto";
import { Tenant } from "@/lib/types";
import {
  META_EMBEDDED_SIGNUP_VERSION,
  META_GRAPH_BASE,
  META_GRAPH_VERSION,
} from "@/lib/whatsapp/graph";

const GRAPH = META_GRAPH_BASE;

export function getWhatsAppToken(tenant: Tenant): string | null {
  if (tenant.whatsapp.mode === "live" && tenant.whatsapp.accessToken) {
    return tenant.whatsapp.accessToken;
  }
  if (
    tenant.whatsapp.wabaId &&
    tenant.whatsapp.wabaId === process.env.META_WABA_ID &&
    process.env.META_SYSTEM_USER_TOKEN
  ) {
    return process.env.META_SYSTEM_USER_TOKEN;
  }
  return process.env.META_WHATSAPP_TOKEN ?? null;
}

export function isLiveWhatsApp(tenant: Tenant): boolean {
  return (
    tenant.whatsapp.connected &&
    tenant.whatsapp.mode === "live" &&
    Boolean(getWhatsAppToken(tenant) && tenant.whatsapp.phoneNumberId)
  );
}

export async function sendWhatsAppText(input: {
  tenant: Tenant;
  to: string;
  body: string;
}): Promise<{ ok: boolean; id?: string; demo?: boolean }> {
  if (!isLiveWhatsApp(input.tenant)) {
    // Demo mode — messages are persisted by the engine; no external call.
    return { ok: true, demo: true, id: `demo_${Date.now()}` };
  }

  const phoneNumberId = input.tenant.whatsapp.phoneNumberId;
  const token = getWhatsAppToken(input.tenant);
  if (!phoneNumberId || !token) throw new Error("Missing live WhatsApp credentials");

  const res = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: input.to.replace(/\D/g, ""),
      type: "text",
      text: { body: input.body },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WhatsApp send failed: ${err}`);
  }
  const data = (await res.json()) as { messages?: Array<{ id: string }> };
  return { ok: true, id: data.messages?.[0]?.id };
}

/** Send an approved Meta Message Template (live) or labelled demo text fallback. */
export async function sendWhatsAppTemplate(input: {
  tenant: Tenant;
  to: string;
  templateName: string;
  language?: string;
  bodyParameters?: string[];
  /** Demo fallback body when templates are not live-approved. */
  fallbackBody: string;
}): Promise<{ ok: boolean; id?: string; demo?: boolean; usedTemplate: boolean }> {
  if (!isLiveWhatsApp(input.tenant)) {
    return {
      ok: true,
      demo: true,
      id: `demo_tpl_${Date.now()}`,
      usedTemplate: false,
    };
  }

  const phoneNumberId = input.tenant.whatsapp.phoneNumberId;
  const token = getWhatsAppToken(input.tenant);
  if (!phoneNumberId || !token) throw new Error("Missing live WhatsApp credentials");

  const components =
    input.bodyParameters && input.bodyParameters.length > 0
      ? [
          {
            type: "body",
            parameters: input.bodyParameters.map((text) => ({
              type: "text",
              text,
            })),
          },
        ]
      : [];

  const res = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: input.to.replace(/\D/g, ""),
      type: "template",
      template: {
        name: input.templateName,
        language: { code: input.language ?? "he" },
        components,
      },
    }),
  });

  if (!res.ok) {
    // Fall back to plain text if template send fails.
    const text = await sendWhatsAppText({
      tenant: input.tenant,
      to: input.to,
      body: input.fallbackBody,
    });
    return { ...text, usedTemplate: false };
  }
  const data = (await res.json()) as { messages?: Array<{ id: string }> };
  return { ok: true, id: data.messages?.[0]?.id, usedTemplate: true };
}

export function getEmbeddedSignupConfig() {
  return {
    appId: process.env.META_APP_ID ?? "",
    configId: process.env.META_EMBEDDED_SIGNUP_CONFIG_ID ?? "",
    graphVersion: META_GRAPH_VERSION,
    /** extras.version for FB.login — v4; sessionInfoVersion intentionally omitted. */
    embeddedSignupVersion: META_EMBEDDED_SIGNUP_VERSION,
    ready: Boolean(
      process.env.META_APP_ID &&
        process.env.META_APP_SECRET &&
        process.env.META_EMBEDDED_SIGNUP_CONFIG_ID,
    ),
  };
}

/**
 * Meta webhook signature check (X-Hub-Signature-256).
 *
 * Fail-closed without META_APP_SECRET whenever live traffic is possible:
 * production, `MOKED_PROVIDER_MODE=live`, or when `hasLiveWhatsAppTenant` is true.
 * Soft-open (unsigned accept) is removed — local demo must set
 * `MOKED_META_SIGNATURE_BYPASS=1` explicitly (never default on; refused in prod/live).
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  options?: { hasLiveWhatsAppTenant?: boolean },
): boolean {
  const production = process.env.NODE_ENV === "production";
  const liveMode = process.env.MOKED_PROVIDER_MODE?.trim() === "live";
  const liveTrafficPossible =
    production || liveMode || Boolean(options?.hasLiveWhatsAppTenant);

  if (process.env.MOKED_META_SIGNATURE_BYPASS === "1") {
    // Explicit local-only bypass — never honor when live traffic is possible.
    return !liveTrafficPossible;
  }

  const secret = process.env.META_APP_SECRET?.trim();
  if (!secret) {
    // No soft-open: missing secret rejects unsigned ingest.
    return false;
  }
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = signatureHeader.slice("sha256=".length);
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(provided, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
