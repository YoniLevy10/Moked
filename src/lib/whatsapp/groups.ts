/**
 * WhatsApp Groups API client (feature-flagged).
 * Enable per-tenant via metaFeatures.groupsEnabled.
 */
import { GRAPH, getWhatsAppToken } from "@/lib/whatsapp/client";
import { Tenant } from "@/lib/types";

export function isGroupsEnabled(tenant: Tenant): boolean {
  return Boolean(tenant.metaFeatures?.groupsEnabled);
}

export async function createWhatsAppGroup(input: {
  tenant: Tenant;
  subject: string;
}): Promise<{ ok: boolean; skipped?: boolean; id?: string; error?: string }> {
  if (!isGroupsEnabled(input.tenant)) {
    return { ok: true, skipped: true };
  }
  const token = getWhatsAppToken(input.tenant);
  const phoneNumberId = input.tenant.whatsapp.phoneNumberId;
  if (!token || !phoneNumberId) return { ok: false, error: "not_connected" };

  const res = await fetch(`${GRAPH}/${phoneNumberId}/groups`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      subject: input.subject,
    }),
  });
  if (!res.ok) return { ok: false, error: await res.text() };
  const data = (await res.json()) as { id?: string };
  return { ok: true, id: data.id };
}
