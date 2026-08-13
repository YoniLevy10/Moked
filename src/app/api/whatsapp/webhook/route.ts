import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/store/db";
import { handleInboundMessage } from "@/lib/processes/engine";
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
  const payload = await req.json();
  const inbound = parseInboundMessages(payload);
  const db = await getDb();
  const results = [];

  for (const msg of inbound) {
    const tenant =
      db.tenants.find((t) => t.whatsapp.phoneNumberId === msg.phoneNumberId) ??
      db.tenants.find((t) => t.id === db.activeTenantId) ??
      db.tenants[0];

    if (!tenant?.whatsapp.connected) continue;

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
