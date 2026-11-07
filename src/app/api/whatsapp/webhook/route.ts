import { NextRequest, NextResponse } from "next/server";
import {
  addBusinessEvents,
  applyTemplateStatusUpdate,
  claimWebhookEvent,
  getTenantByPhoneNumberId,
  updateMessageDeliveryByMetaId,
} from "@/lib/store/db";
import { handleInboundMessage } from "@/lib/processes/engine";
import { verifyMetaSignature } from "@/lib/whatsapp/client";
import {
  parseInboundMessages,
  parseStatusUpdates,
  parseTemplateStatusUpdates,
  webhookIdempotencyKey,
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

  const results: Array<Record<string, unknown>> = [];
  let skipped = 0;

  for (const status of parseStatusUpdates(payload)) {
    const tenant = status.phoneNumberId
      ? await getTenantByPhoneNumberId(status.phoneNumberId)
      : null;
    const key = webhookIdempotencyKey(
      status.entryId,
      `status:${status.metaMessageId}:${status.status}`,
    );
    const claimed = await claimWebhookEvent({
      id: key,
      tenantId: tenant?.id ?? null,
      payload: status as unknown as Record<string, unknown>,
    });
    if (!claimed) {
      skipped += 1;
      continue;
    }

    const at = status.timestamp
      ? new Date(Number(status.timestamp) * 1000).toISOString()
      : new Date().toISOString();
    const statusLower = status.status.toLowerCase();
    const patch: {
      metaMessageId: string;
      deliveredAt?: string;
      readAt?: string;
      failedAt?: string;
      errorCode?: string;
    } = { metaMessageId: status.metaMessageId };

    if (statusLower === "delivered") patch.deliveredAt = at;
    else if (statusLower === "read") {
      patch.readAt = at;
      patch.deliveredAt = at;
    } else if (statusLower === "failed") {
      patch.failedAt = at;
      patch.errorCode = status.errorCode;
    }

    const message = await updateMessageDeliveryByMetaId(patch);
    if (statusLower === "failed" && message) {
      await addBusinessEvents([
        {
          tenantId: message.tenantId,
          conversationId: message.conversationId,
          eventType: "message.failed",
          payload: {
            metaMessageId: status.metaMessageId,
            errorCode: status.errorCode,
          },
          channel: "whatsapp",
        },
      ]);
    }
    results.push({
      type: "status",
      metaMessageId: status.metaMessageId,
      status: statusLower,
      updated: Boolean(message),
    });
  }

  for (const tpl of parseTemplateStatusUpdates(payload)) {
    const tenant = tpl.phoneNumberId
      ? await getTenantByPhoneNumberId(tpl.phoneNumberId)
      : null;
    if (!tenant) continue;
    const key = webhookIdempotencyKey(
      tpl.entryId,
      `template:${tpl.metaId ?? tpl.name ?? "unknown"}:${tpl.event ?? ""}`,
    );
    const claimed = await claimWebhookEvent({
      id: key,
      tenantId: tenant.id,
      payload: tpl as unknown as Record<string, unknown>,
    });
    if (!claimed) {
      skipped += 1;
      continue;
    }

    const row = await applyTemplateStatusUpdate({
      tenantId: tenant.id,
      metaId: tpl.metaId,
      name: tpl.name,
      language: tpl.language,
      event: tpl.event,
      reason: tpl.reason,
    });

    if (row.status === "rejected") {
      await addBusinessEvents([
        {
          tenantId: tenant.id,
          eventType: "template.rejected",
          payload: {
            name: row.name,
            language: row.language,
            reason: row.rejectionReason,
            metaId: row.metaId,
          },
          channel: "whatsapp",
        },
      ]);
    }

    results.push({
      type: "template_status",
      templateId: row.id,
      status: row.status,
    });
  }

  const inbound = parseInboundMessages(payload);
  for (const msg of inbound) {
    const tenant = await getTenantByPhoneNumberId(msg.phoneNumberId);
    if (!tenant) continue;

    const key = webhookIdempotencyKey(msg.entryId, `msg:${msg.messageId}`);
    const claimed = await claimWebhookEvent({
      id: key,
      tenantId: tenant.id,
      payload: msg as unknown as Record<string, unknown>,
    });
    if (!claimed) {
      skipped += 1;
      continue;
    }

    const handled = await handleInboundMessage({
      tenant,
      customerWaId: msg.from,
      customerName: msg.name,
      text: msg.text,
      metaMessageId: msg.messageId,
    });
    results.push({
      type: "message",
      conversationId: handled.conversation.id,
      events: handled.result.events,
    });
  }

  return NextResponse.json({
    ok: true,
    processed: results.length,
    skipped,
    results,
  });
}
