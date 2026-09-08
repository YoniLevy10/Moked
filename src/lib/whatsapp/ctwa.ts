import { GRAPH, getWhatsAppToken } from "@/lib/whatsapp/client";
import { Tenant } from "@/lib/types";

/**
 * Click-to-WhatsApp Conversions API scaffolding.
 * Sends a custom conversion event when configured with META_DATASET_ID.
 */
export async function sendCtwaConversion(input: {
  tenant: Tenant;
  eventName: "Lead" | "Schedule" | "Purchase" | "Other";
  ctwaSourceId?: string;
  valueIls?: number;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const datasetId = process.env.META_DATASET_ID;
  const token = getWhatsAppToken(input.tenant) ?? process.env.META_WHATSAPP_TOKEN;
  if (!datasetId || !token) {
    return { ok: true, skipped: true };
  }
  if (!input.ctwaSourceId) {
    return { ok: true, skipped: true };
  }

  const res = await fetch(`${GRAPH}/${datasetId}/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: [
        {
          event_name: input.eventName,
          event_time: Math.floor(Date.now() / 1000),
          action_source: "business_messaging",
          messaging_channel: "whatsapp",
          custom_data: {
            currency: "ILS",
            value: input.valueIls ?? 0,
          },
          user_data: {
            ctwa_clid: input.ctwaSourceId,
          },
        },
      ],
    }),
  });
  if (!res.ok) return { ok: false, error: await res.text() };
  return { ok: true };
}
