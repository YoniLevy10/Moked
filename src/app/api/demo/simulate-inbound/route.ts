import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActiveTenant } from "@/lib/store/db";
import { handleInboundMessage } from "@/lib/processes/engine";

const Schema = z.object({
  from: z.string().default("972501234567"),
  name: z.string().optional(),
  text: z.string().min(1),
});

/** Local simulator — acts as a customer WhatsApp message in demo mode. */
export async function POST(req: NextRequest) {
  const tenant = await getActiveTenant();
  if (!tenant) {
    return NextResponse.json({ error: "no_tenant" }, { status: 400 });
  }
  if (!tenant.whatsapp.connected) {
    return NextResponse.json({ error: "whatsapp_not_connected" }, { status: 400 });
  }

  const body = Schema.parse(await req.json());
  const result = await handleInboundMessage({
    tenant,
    customerWaId: body.from,
    customerName: body.name ?? "לקוח דמו",
    text: body.text,
  });

  return NextResponse.json({
    conversationId: result.conversation.id,
    activeProcess: result.conversation.activeProcess,
    intent: result.conversation.intent,
    leadScore: result.conversation.leadScore,
    events: result.result.events,
    replies: result.result.replies,
  });
}
