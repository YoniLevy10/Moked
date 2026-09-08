/**
 * WhatsApp Calling API client (feature-flagged).
 * Enable per-tenant via metaFeatures.callingEnabled.
 */
import { GRAPH, getWhatsAppToken } from "@/lib/whatsapp/client";
import { Tenant } from "@/lib/types";

export function isCallingEnabled(tenant: Tenant): boolean {
  return Boolean(tenant.metaFeatures?.callingEnabled);
}

export async function initiateWhatsAppCall(input: {
  tenant: Tenant;
  to: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!isCallingEnabled(input.tenant)) {
    return { ok: true, skipped: true };
  }
  const token = getWhatsAppToken(input.tenant);
  const phoneNumberId = input.tenant.whatsapp.phoneNumberId;
  if (!token || !phoneNumberId) return { ok: false, error: "not_connected" };

  // Placeholder Graph shape — enable when Meta Calling is approved on the app.
  const res = await fetch(`${GRAPH}/${phoneNumberId}/calls`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: input.to.replace(/\D/g, ""),
      action: "connect",
    }),
  });
  if (!res.ok) return { ok: false, error: await res.text() };
  return { ok: true };
}
