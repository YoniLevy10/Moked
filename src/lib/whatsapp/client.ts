import { Tenant } from "@/lib/types";

const GRAPH = "https://graph.facebook.com/v21.0";

export function isLiveWhatsApp(tenant: Tenant): boolean {
  return (
    tenant.whatsapp.connected &&
    tenant.whatsapp.mode === "live" &&
    Boolean(process.env.META_WHATSAPP_TOKEN)
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
  if (!phoneNumberId) throw new Error("Missing phoneNumberId");

  const res = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.META_WHATSAPP_TOKEN}`,
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
      process.env.META_APP_ID && process.env.META_EMBEDDED_SIGNUP_CONFIG_ID,
    ),
  };
}
