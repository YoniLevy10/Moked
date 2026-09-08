import { NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/auth/tenant-context";
import { fetchPricingAnalytics } from "@/lib/whatsapp/analytics";
import { refreshPhoneQuality } from "@/lib/whatsapp/quality";
import { ensureCoreHeTemplates, listMessageTemplates } from "@/lib/whatsapp/templates";
import { getEmbeddedSignupConfig, isLiveWhatsApp } from "@/lib/whatsapp/client";
import { getMetaBusinessAgentStatus } from "@/lib/whatsapp/meta-agent";

export async function GET() {
  const ctx = await requireTenantContext();
  if (!ctx.ok) return ctx.response;

  const embedded = getEmbeddedSignupConfig();
  let quality = ctx.tenant;
  try {
    const refreshed = await refreshPhoneQuality(ctx.tenant);
    if (refreshed) quality = refreshed;
  } catch {
    /* ignore poll errors */
  }

  let templates: unknown[] = [];
  try {
    templates = await listMessageTemplates(quality);
  } catch {
    templates = [];
  }

  let analytics = null;
  try {
    analytics = await fetchPricingAnalytics(quality);
  } catch (e) {
    analytics = {
      error: e instanceof Error ? e.message : "analytics_failed",
    };
  }

  return NextResponse.json({
    embeddedSignup: embedded,
    live: isLiveWhatsApp(quality),
    whatsapp: quality.whatsapp,
    metaFeatures: quality.metaFeatures ?? {},
    templates,
    analytics,
    metaBusinessAgent: getMetaBusinessAgentStatus(quality),
    webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/whatsapp/webhook`,
  });
}

export async function POST(req: Request) {
  const ctx = await requireTenantContext();
  if (!ctx.ok) return ctx.response;
  const body = (await req.json().catch(() => ({}))) as { action?: string };

  if (body.action === "ensure_templates") {
    const result = await ensureCoreHeTemplates(ctx.tenant);
    return NextResponse.json(result);
  }
  if (body.action === "refresh_quality") {
    const tenant = await refreshPhoneQuality(ctx.tenant);
    return NextResponse.json({ tenant });
  }

  return NextResponse.json({ error: "unknown_action" }, { status: 400 });
}
