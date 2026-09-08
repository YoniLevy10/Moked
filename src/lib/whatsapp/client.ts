import { createHmac, timingSafeEqual } from "crypto";
import { Tenant } from "@/lib/types";
import type { OutboundAction } from "@/lib/processes/types";

export const GRAPH = "https://graph.facebook.com/v21.0";

export type SendResult = {
  ok: boolean;
  id?: string;
  demo?: boolean;
  error?: string;
};

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

function toDigits(to: string): string {
  return to.replace(/\D/g, "");
}

async function postMessage(
  tenant: Tenant,
  payload: Record<string, unknown>,
): Promise<SendResult> {
  if (!isLiveWhatsApp(tenant)) {
    return { ok: true, demo: true, id: `demo_${Date.now()}` };
  }
  const phoneNumberId = tenant.whatsapp.phoneNumberId!;
  const token = getWhatsAppToken(tenant)!;
  const res = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      ...payload,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    return { ok: false, error: err };
  }
  const data = (await res.json()) as { messages?: Array<{ id: string }> };
  return { ok: true, id: data.messages?.[0]?.id };
}

export async function sendWhatsAppText(input: {
  tenant: Tenant;
  to: string;
  body: string;
}): Promise<SendResult> {
  return postMessage(input.tenant, {
    to: toDigits(input.to),
    type: "text",
    text: { preview_url: true, body: input.body },
  });
}

export async function sendInteractiveButtons(input: {
  tenant: Tenant;
  to: string;
  body: string;
  buttons: Array<{ id: string; title: string }>;
  footer?: string;
}): Promise<SendResult> {
  return postMessage(input.tenant, {
    to: toDigits(input.to),
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: input.body },
      ...(input.footer ? { footer: { text: input.footer } } : {}),
      action: {
        buttons: input.buttons.slice(0, 3).map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title.slice(0, 20) },
        })),
      },
    },
  });
}

export async function sendInteractiveList(input: {
  tenant: Tenant;
  to: string;
  body: string;
  buttonLabel: string;
  sections: Array<{
    title?: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>;
}): Promise<SendResult> {
  return postMessage(input.tenant, {
    to: toDigits(input.to),
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: input.body },
      action: {
        button: input.buttonLabel.slice(0, 20),
        sections: input.sections.map((s) => ({
          title: s.title,
          rows: s.rows.map((r) => ({
            id: r.id,
            title: r.title.slice(0, 24),
            description: r.description?.slice(0, 72),
          })),
        })),
      },
    },
  });
}

export async function sendLocationRequest(input: {
  tenant: Tenant;
  to: string;
  body: string;
}): Promise<SendResult> {
  return postMessage(input.tenant, {
    to: toDigits(input.to),
    type: "interactive",
    interactive: {
      type: "location_request_message",
      body: { text: input.body },
      action: { name: "send_location" },
    },
  });
}

export async function sendTemplate(input: {
  tenant: Tenant;
  to: string;
  name: string;
  languageCode?: string;
  bodyParameters?: string[];
  buttonParameters?: string[];
}): Promise<SendResult> {
  const components: Array<Record<string, unknown>> = [];
  if (input.bodyParameters?.length) {
    components.push({
      type: "body",
      parameters: input.bodyParameters.map((text) => ({ type: "text", text })),
    });
  }
  return postMessage(input.tenant, {
    to: toDigits(input.to),
    type: "template",
    template: {
      name: input.name,
      language: { code: input.languageCode ?? "he" },
      ...(components.length ? { components } : {}),
    },
  });
}

export async function sendMedia(input: {
  tenant: Tenant;
  to: string;
  mediaType: "image" | "document" | "audio" | "video";
  link: string;
  caption?: string;
  filename?: string;
}): Promise<SendResult> {
  const media: Record<string, unknown> = { link: input.link };
  if (input.caption && input.mediaType !== "audio") media.caption = input.caption;
  if (input.filename && input.mediaType === "document") {
    media.filename = input.filename;
  }
  return postMessage(input.tenant, {
    to: toDigits(input.to),
    type: input.mediaType,
    [input.mediaType]: media,
  });
}

export async function sendFlow(input: {
  tenant: Tenant;
  to: string;
  body: string;
  flowId?: string;
  flowName?: string;
  flowToken?: string;
  screen?: string;
}): Promise<SendResult> {
  const parameters: Record<string, unknown> = {
    flow_message_version: "3",
    flow_cta: "המשך",
    flow_action: "navigate",
  };
  if (input.flowId) parameters.flow_id = input.flowId;
  if (input.flowName) parameters.flow_name = input.flowName;
  if (input.flowToken) parameters.flow_token = input.flowToken;
  if (input.screen) {
    parameters.flow_action_payload = { screen: input.screen };
  }
  return postMessage(input.tenant, {
    to: toDigits(input.to),
    type: "interactive",
    interactive: {
      type: "flow",
      body: { text: input.body },
      action: { name: "flow", parameters },
    },
  });
}

export async function markAsRead(input: {
  tenant: Tenant;
  messageId: string;
}): Promise<SendResult> {
  if (!isLiveWhatsApp(input.tenant)) {
    return { ok: true, demo: true };
  }
  return postMessage(input.tenant, {
    status: "read",
    message_id: input.messageId,
  });
}

export async function sendTypingIndicator(input: {
  tenant: Tenant;
  messageId: string;
}): Promise<SendResult> {
  if (!isLiveWhatsApp(input.tenant)) {
    return { ok: true, demo: true };
  }
  const phoneNumberId = input.tenant.whatsapp.phoneNumberId!;
  const token = getWhatsAppToken(input.tenant)!;
  const res = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: input.messageId,
      typing_indicator: { type: "text" },
    }),
  });
  if (!res.ok) return { ok: false, error: await res.text() };
  return { ok: true };
}

/** Dispatch a structured process reply to the right Graph payload. */
export async function sendOutboundAction(input: {
  tenant: Tenant;
  to: string;
  reply: OutboundAction;
}): Promise<SendResult> {
  const { tenant, to, reply } = input;
  const interactive = reply.interactive;

  if (reply.type === "template" && reply.template) {
    return sendTemplate({
      tenant,
      to,
      name: reply.template.name,
      languageCode: reply.template.languageCode,
      bodyParameters: reply.template.bodyParameters,
    });
  }

  if (reply.type === "interactive" && interactive?.kind === "buttons") {
    return sendInteractiveButtons({
      tenant,
      to,
      body: reply.body,
      buttons: interactive.buttons,
      footer: interactive.footer,
    });
  }

  if (reply.type === "interactive" && interactive?.kind === "list") {
    return sendInteractiveList({
      tenant,
      to,
      body: reply.body,
      buttonLabel: interactive.buttonLabel,
      sections: interactive.sections,
    });
  }

  if (reply.type === "interactive" && interactive?.kind === "location_request") {
    return sendLocationRequest({ tenant, to, body: reply.body });
  }

  if (reply.type === "interactive" && interactive?.kind === "flow") {
    const flowId = interactive.flowId;
    const flowName = interactive.flowName;
    if (flowId || flowName) {
      return sendFlow({
        tenant,
        to,
        body: reply.body,
        flowId,
        flowName,
        flowToken: interactive.flowToken,
        screen: interactive.screen,
      });
    }
  }

  if (reply.media) {
    return sendMedia({
      tenant,
      to,
      mediaType: reply.media.mediaType,
      link: reply.media.link,
      caption: reply.media.caption ?? reply.body,
      filename: reply.media.filename,
    });
  }

  return sendWhatsAppText({ tenant, to, body: reply.body });
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
    version: "v4" as const,
  };
}

/** Verify Meta X-Hub-Signature-256 when META_APP_SECRET is set. */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return true;
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

export async function downloadMedia(input: {
  tenant: Tenant;
  mediaId: string;
}): Promise<{ url?: string; mimeType?: string; error?: string }> {
  const token = getWhatsAppToken(input.tenant);
  if (!token) return { error: "no_token" };
  const meta = await fetch(`${GRAPH}/${input.mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!meta.ok) return { error: await meta.text() };
  const data = (await meta.json()) as { url?: string; mime_type?: string };
  return { url: data.url, mimeType: data.mime_type };
}
