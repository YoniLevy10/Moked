import { NextRequest, NextResponse } from "next/server";
import { getTenantByPhoneNumberId } from "@/lib/store/db";
import { handleInboundMessage } from "@/lib/processes/engine";
import { verifyMetaSignature } from "@/lib/whatsapp/client";
import { parseInboundMessages } from "@/lib/whatsapp/webhook";

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");
  const verify = process.env.META_WEBHOOK_VERIFY_TOKEN ?? "moked_dev_verify_token";

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

  const inbound = parseInboundMessages(payload);
  const results = [];

  for (const msg of inbound) {
    const tenant = await getTenantByPhoneNumberId(msg.phoneNumberId);
    if (!tenant) continue;

    const handled = await handleInboundMessage({
      tenant,
      customerWaId: msg.from,
      customerName: msg.name,
      text: msg.text,
      metaMessageId: msg.messageId,
    });
    results.push({
      conversationId: handled.conversation.id,
      events: handled.result.events,
    });
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}
