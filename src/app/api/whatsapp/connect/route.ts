import { NextResponse } from "next/server";
import { connectWhatsAppDemo, getActiveTenant } from "@/lib/store/db";
import { getEmbeddedSignupConfig } from "@/lib/whatsapp/client";

export async function GET() {
  const tenant = await getActiveTenant();
  const embedded = getEmbeddedSignupConfig();
  return NextResponse.json({
    tenantWhatsapp: tenant?.whatsapp ?? null,
    embeddedSignup: embedded,
  });
}

export async function POST(req: Request) {
  const tenant = await getActiveTenant();
  if (!tenant) {
    return NextResponse.json({ error: "no_tenant" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    mode?: "demo" | "live";
  };

  if (body.mode === "live") {
    const embedded = getEmbeddedSignupConfig();
    if (!embedded.ready) {
      return NextResponse.json(
        {
          error: "meta_not_configured",
          message:
            "חסרים META_APP_ID / META_EMBEDDED_SIGNUP_CONFIG_ID. השתמשו בדמו או הגדירו .env.local",
        },
        { status: 400 },
      );
    }
    // Live Embedded Signup completes client-side; this endpoint reserves the hook.
    return NextResponse.json({
      ok: true,
      next: "complete_embedded_signup_client",
      embedded,
    });
  }

  const updated = await connectWhatsAppDemo(tenant.id);
  return NextResponse.json({ tenant: updated });
}
