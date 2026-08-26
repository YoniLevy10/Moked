import { NextResponse } from "next/server";
import {
  connectWhatsAppDemo,
  connectWhatsAppLive,
} from "@/lib/store/db";
import { requireTenantContext } from "@/lib/auth/tenant-context";
import { getEmbeddedSignupConfig } from "@/lib/whatsapp/client";
import { completeEmbeddedSignup } from "@/lib/whatsapp/meta-oauth";

export async function GET() {
  const ctx = await requireTenantContext();
  if (!ctx.ok) {
    // Allow unauthenticated config probe for Embedded Signup button bootstrap
    // only when no session — still return embedded config only.
    const embedded = getEmbeddedSignupConfig();
    return NextResponse.json({
      tenantWhatsapp: null,
      embeddedSignup: embedded,
    });
  }
  return NextResponse.json({
    tenantWhatsapp: ctx.tenant.whatsapp,
    embeddedSignup: getEmbeddedSignupConfig(),
  });
}

export async function POST(req: Request) {
  const ctx = await requireTenantContext();
  if (!ctx.ok) return ctx.response;

  const body = (await req.json().catch(() => ({}))) as {
    mode?: "demo" | "live";
    code?: string;
    wabaId?: string;
    phoneNumberId?: string;
  };

  if (body.mode === "live") {
    const embedded = getEmbeddedSignupConfig();
    if (!embedded.ready) {
      return NextResponse.json(
        {
          error: "meta_not_configured",
          message:
            "חסרים META_APP_ID / META_APP_SECRET / META_EMBEDDED_SIGNUP_CONFIG_ID",
        },
        { status: 400 },
      );
    }

    // Client must finish Embedded Signup and POST code + ids.
    if (!body.code || !body.wabaId || !body.phoneNumberId) {
      return NextResponse.json({
        ok: false,
        next: "launch_embedded_signup",
        embedded,
        message: "הפעילו Embedded Signup בצד הלקוח והעבירו code + wabaId + phoneNumberId",
      });
    }

    try {
      const result = await completeEmbeddedSignup({
        code: body.code,
        wabaId: body.wabaId,
        phoneNumberId: body.phoneNumberId,
      });
      const updated = await connectWhatsAppLive(ctx.tenant.id, {
        wabaId: body.wabaId,
        phoneNumberId: body.phoneNumberId,
        displayPhone: result.displayPhone,
        accessToken: result.accessToken,
      });
      return NextResponse.json({ tenant: updated, mode: "live" });
    } catch (e) {
      return NextResponse.json(
        {
          error: "live_connect_failed",
          message: e instanceof Error ? e.message : "שגיאה",
        },
        { status: 400 },
      );
    }
  }

  const updated = await connectWhatsAppDemo(ctx.tenant.id);
  return NextResponse.json({ tenant: updated, mode: "demo" });
}
