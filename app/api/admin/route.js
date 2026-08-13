import { NextResponse } from "next/server";
import {
  createBusiness,
  listBusinesses,
  listSessions,
  listEvents,
  listApprovals,
  listMessages,
  snapshot,
  resetStore,
  getBusiness,
} from "@/lib/store/memory";
import { WORKFLOWS, PLAN_PRICE_ILS, PRINCIPLE } from "@/lib/workflows/catalog";
import { routeInbound } from "@/lib/engine/router";
import { whatsappConfigured } from "@/lib/whatsapp/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    product: "מוקד",
    principle: PRINCIPLE,
    planPriceIls: PLAN_PRICE_ILS,
    whatsappConfigured: whatsappConfigured(),
    workflows: WORKFLOWS,
    ...snapshot(),
  });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const action = body.action;

  if (action === "reset") {
    resetStore();
    return NextResponse.json({ ok: true, reset: true });
  }

  if (action === "create_business") {
    const business = createBusiness({
      name: body.name,
      field: body.field,
      phone: body.phone,
    });
    return NextResponse.json({ ok: true, business });
  }

  if (action === "list") {
    return NextResponse.json({
      ok: true,
      businesses: listBusinesses(),
      sessions: listSessions(body.businessId),
      events: listEvents(40),
      approvals: listApprovals(body.businessId),
      messages: listMessages({
        businessId: body.businessId,
        contactPhone: body.contactPhone,
      }),
    });
  }

  if (action === "sim_message") {
    let businessId = body.businessId;
    if (!businessId) {
      const existing = listBusinesses()[0];
      businessId = existing?.id || createBusiness({ name: "עסק סימולציה" }).id;
    }
    if (!getBusiness(businessId)) {
      return NextResponse.json({ ok: false, error: "business_not_found" }, { status: 404 });
    }
    const contactPhone = body.contactPhone || "972500000001";
    const result = await routeInbound({
      businessId,
      contactPhone,
      text: body.text || "",
      buttonId: body.buttonId || null,
      workflow: body.workflow || "lead",
      mode: "sim",
    });
    return NextResponse.json({
      ok: true,
      ...result,
      messages: listMessages({ businessId, contactPhone }),
      approvals: listApprovals(businessId),
      events: listEvents(20),
    });
  }

  return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
}
