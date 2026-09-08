import { NextRequest, NextResponse } from "next/server";
import {
  claimWebhookEvent,
  getTenantByPhoneNumberId,
  updateMessageDeliveryByMetaId,
} from "@/lib/store/db";
import { handleInboundMessage } from "@/lib/processes/engine";
import { markAsRead, verifyMetaSignature } from "@/lib/whatsapp/client";
import {
  parseInboundMessages,
  parseStatusUpdates,
} from "@/lib/whatsapp/webhook";

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");
  const verify =
    process.env.META_WEBHOOK_VERIFY_TOKEN ?? "moked_dev_verify_token";

  if (mode === "subscribe" && token === verify && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");
  if (!verifyMetaSignature(rawBody, signature)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const statuses = parseStatusUpdates(payload);
  let statusUpdated = 0;
  for (const st of statuses) {
    const claimed = await claimWebhookEvent(
      `status:${st.metaMessageId}:${st.status}`,
      null,
      st,
    );
    if (!claimed) continue;
    const ok = await updateMessageDeliveryByMetaId(
      st.metaMessageId,
      st.status,
      st.timestamp,
    );
    if (ok) statusUpdated += 1;
  }

  const inbound = parseInboundMessages(payload);
  const results = [];

  for (const msg of inbound) {
    const tenant = await getTenantByPhoneNumberId(msg.phoneNumberId);
    if (!tenant) continue;

    const claimed = await claimWebhookEvent(msg.messageId, tenant.id, msg);
    if (!claimed) continue;

    void markAsRead({ tenant, messageId: msg.messageId }).catch(() => undefined);

    const locationText =
      msg.location?.address ||
      (msg.location?.latitude != null && msg.location?.longitude != null
        ? `${msg.location.latitude},${msg.location.longitude}`
        : undefined);

    const handled = await handleInboundMessage({
      tenant,
      customerWaId: msg.from,
      customerName: msg.name,
      text: locationText || msg.text,
      metaMessageId: msg.messageId,
      interactiveId: msg.interactiveId,
      locationAddress: locationText,
      flowResponseJson: msg.flowResponseJson,
      referral: msg.referral,
      mediaId: msg.mediaId,
      mediaMime: msg.mediaMime,
    });
    results.push({
      conversationId: handled.conversation.id,
      events: handled.result.events,
    });
  }

  return NextResponse.json({
    ok: true,
    processed: results.length,
    statusUpdated,
    results,
  });
}
