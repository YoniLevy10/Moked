import { NextResponse } from "next/server";
import {
  getVerifyToken,
  parseWebhookPayload,
  whatsappConfigured,
} from "@/lib/whatsapp/client";
import { listBusinesses, createBusiness } from "@/lib/store/memory";
import { routeInbound } from "@/lib/engine/router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Meta webhook verification */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === getVerifyToken()) {
    return new NextResponse(challenge || "", { status: 200 });
  }
  return NextResponse.json({ ok: false }, { status: 403 });
}

/** Inbound WhatsApp messages */
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const messages = parseWebhookPayload(body);

  let business = listBusinesses()[0];
  if (!business) {
    business = createBusiness({ name: "עסק WhatsApp", field: "שירותים" });
  }

  const results = [];
  for (const msg of messages) {
    const result = await routeInbound({
      businessId: business.id,
      contactPhone: msg.contactPhone,
      text: msg.text,
      buttonId: msg.buttonId,
      workflow: "lead",
      mode: whatsappConfigured() ? "live" : "sim",
    });
    results.push({
      contactPhone: msg.contactPhone,
      sessionId: result.session.id,
      step: result.session.step,
    });
  }

  return NextResponse.json({ ok: true, handled: results.length, results });
}
