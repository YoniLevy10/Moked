import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantContext } from "@/lib/auth/tenant-context";
import {
  connectWhatsAppDemo,
  getTenantById,
  updateTenant,
} from "@/lib/store/db";
import { handleInboundMessage } from "@/lib/processes/engine";
import { bustReadinessCache } from "@/lib/product/readiness";

const Body = z.object({
  /** When true, connect a demo ad number if not already connected. */
  ensureDemoNumber: z.boolean().optional(),
  text: z.string().default("שלום"),
});

/**
 * Live onboarding gate: prospect texts the **new ad number**; agent must answer
 * with the business details. Demo path simulates the inbound without Meta.
 * No coexistence / main-number migration.
 */
export async function POST(req: NextRequest) {
  const ctx = await requireTenantContext();
  if (!ctx.ok) return ctx.response;

  const body = Body.parse(await req.json().catch(() => ({})));
  let tenant = ctx.tenant;

  if (!tenant.bot.approved) {
    return NextResponse.json(
      {
        ok: false,
        error: "bot_not_approved",
        message: "אשרו הוראות בוט לפני בדיקת שלום חיה",
      },
      { status: 400 },
    );
  }

  if (tenant.subscription.status !== "active") {
    // Demo onboarding: activate subscription so readiness can pass.
    tenant = await updateTenant(tenant.id, {
      subscription: { ...tenant.subscription, status: "active" },
    });
  }

  if (!tenant.whatsapp.connected && body.ensureDemoNumber !== false) {
    tenant = await connectWhatsAppDemo(tenant.id);
    bustReadinessCache(tenant.id);
  }

  if (!tenant.whatsapp.connected) {
    return NextResponse.json(
      {
        ok: false,
        error: "whatsapp_not_connected",
        message: "חברו מספר WhatsApp חדש לפרסום לפני הבדיקה",
      },
      { status: 400 },
    );
  }

  const result = await handleInboundMessage({
    tenant,
    customerWaId: tenant.phone.replace(/\D/g, "") || "972501111111",
    customerName: tenant.ownerName,
    text: body.text,
  });

  const replyBodies = result.result.replies.map((r) => r.body);
  const joined = replyBodies.join("\n");
  const mentionsBusiness =
    joined.includes(tenant.businessName) ||
    Boolean(tenant.bot.answers.what && joined.includes(tenant.bot.answers.what.slice(0, 12)));
  const ok =
    replyBodies.length > 0 &&
    !result.result.events?.includes("tenant.blocked") &&
    (mentionsBusiness || /שלום|היי|תודה|קיבלנו|פנייה/i.test(joined));

  const fresh = await getTenantById(tenant.id);
  const displayPhone =
    fresh?.whatsapp.displayPhone ?? tenant.whatsapp.displayPhone ?? "";
  const digits = displayPhone.replace(/\D/g, "");
  const waLink = digits
    ? `https://wa.me/${digits}?text=${encodeURIComponent("שלום")}`
    : null;

  return NextResponse.json({
    ok,
    displayPhone,
    waLink,
    mode: fresh?.whatsapp.mode ?? tenant.whatsapp.mode,
    replies: replyBodies,
    events: result.result.events ?? [],
    positioning:
      "מספר חדש לפרסום/נחיתה בלבד — המספר האישי של העסק לא נודד ולא ב־Coexistence.",
  });
}

export async function GET() {
  const ctx = await requireTenantContext();
  if (!ctx.ok) return ctx.response;
  const t = ctx.tenant;
  const displayPhone = t.whatsapp.displayPhone ?? "";
  const digits = displayPhone.replace(/\D/g, "");
  return NextResponse.json({
    connected: t.whatsapp.connected,
    mode: t.whatsapp.mode,
    displayPhone,
    waLink: digits
      ? `https://wa.me/${digits}?text=${encodeURIComponent("שלום")}`
      : null,
    botApproved: Boolean(t.bot.approved),
    subscriptionActive: t.subscription.status === "active",
    positioning:
      "מספר חדש לפרסום — בלי להעביר את המספר הראשי של העסק.",
  });
}
