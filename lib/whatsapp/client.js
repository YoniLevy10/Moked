/**
 * WhatsApp Cloud API client (Meta).
 * Without env vars, send* functions no-op and return { skipped: true }.
 */

const GRAPH = "https://graph.facebook.com/v21.0";

export function whatsappConfigured() {
  return Boolean(
    process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
  );
}

export function getVerifyToken() {
  return process.env.WHATSAPP_VERIFY_TOKEN || "moked_verify";
}

export async function sendWhatsAppText({ to, body }) {
  if (!whatsappConfigured()) {
    return { skipped: true, reason: "whatsapp_not_configured" };
  }
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const res = await fetch(`${GRAPH}/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: String(to).replace(/\D/g, ""),
      type: "text",
      text: { body },
    }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function sendWhatsAppButtons({ to, body, buttons }) {
  if (!whatsappConfigured()) {
    return { skipped: true, reason: "whatsapp_not_configured" };
  }
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const limited = (buttons || []).slice(0, 3).map((b, i) => ({
    type: "reply",
    reply: {
      id: b.id || `btn_${i}`,
      title: String(b.title).slice(0, 20),
    },
  }));
  const res = await fetch(`${GRAPH}/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: String(to).replace(/\D/g, ""),
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: body },
        action: { buttons: limited },
      },
    }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/**
 * Parse Meta webhook payload into normalized inbound messages.
 */
export function parseWebhookPayload(body) {
  const out = [];
  const entries = body?.entry || [];
  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value;
      if (!value?.messages) continue;
      for (const msg of value.messages) {
        const contactPhone = msg.from;
        let text = "";
        let buttonId = null;
        if (msg.type === "text") text = msg.text?.body || "";
        if (msg.type === "interactive") {
          buttonId =
            msg.interactive?.button_reply?.id ||
            msg.interactive?.list_reply?.id ||
            null;
          text =
            msg.interactive?.button_reply?.title ||
            msg.interactive?.list_reply?.title ||
            "";
        }
        out.push({
          contactPhone,
          text,
          buttonId,
          messageId: msg.id,
          timestamp: msg.timestamp,
        });
      }
    }
  }
  return out;
}
