import { createHmac, timingSafeEqual } from "crypto";
import { Tenant } from "@/lib/types";

const GRAPH = "https://graph.facebook.com/v21.0";

export function getWhatsAppToken(tenant: Tenant): string | null {
  if (tenant.whatsapp.mode === "live" && tenant.whatsapp.accessToken) {
    return tenant.whatsapp.accessToken;
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

export function getEmbeddedSignupConfig() {
  return {
    appId: process.env.META_APP_ID ?? "",
    configId: process.env.META_EMBEDDED_SIGNUP_CONFIG_ID ?? "",
    graphVersion: "v21.0",
    ready: Boolean(
      process.env.META_APP_ID &&
        process.env.META_APP_SECRET &&
        process.env.META_EMBEDDED_SIGNUP_CONFIG_ID,
    ),
  };
}

/** Verify Meta X-Hub-Signature-256 when META_APP_SECRET is set. */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return true; // soft-open in local/dev without secret
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
