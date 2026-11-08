import { NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/auth/tenant-context";
import {
  bustReadinessCache,
  evaluateReadiness,
  providerMode,
} from "@/lib/product/readiness";
import { updateTenant } from "@/lib/store/db";

function isDemoWhatsApp(tenant: {
  whatsapp: { mode?: string; phoneNumberId?: string };
}): boolean {
  const id = tenant.whatsapp.phoneNumberId ?? "";
  return tenant.whatsapp.mode === "demo" || id.startsWith("demo_");
}

/**
 * Owner (and Managed via active tenant) go-live — same readiness evaluator
 * as `/api/admin/tenants/[id]/go-live`. Live Meta tenants force live probes;
 * demo path uses demo-relaxed readiness and does not invent a live mode.
 */
export async function POST() {
  const ctx = await requireTenantContext();
  if (!ctx.ok) return ctx.response;

  const id = ctx.tenant.id;
  bustReadinessCache(id);

  const forceLive =
    providerMode() === "live" ||
    (ctx.tenant.whatsapp.connected && !isDemoWhatsApp(ctx.tenant));

  const report = await evaluateReadiness(id, {
    bypassCache: true,
    forceLive,
  });
  if (!report.ready) {
    return NextResponse.json(
      {
        error: "tenant_not_ready",
        ready: false,
        checks: report.checks.filter((c) => c.blocking && !c.ok),
        report,
      },
      { status: 409 },
    );
  }

  let tenant = ctx.tenant;
  if (
    tenant.whatsapp.connected &&
    tenant.whatsapp.mode !== "live" &&
    !isDemoWhatsApp(tenant)
  ) {
    tenant = await updateTenant(id, {
      whatsapp: { ...tenant.whatsapp, mode: "live" },
    });
  }
  // Never flip subscription.status here — billing webhook / checkout owns that.

  bustReadinessCache(id);

  return NextResponse.json({
    ok: true,
    ready: true,
    demo: isDemoWhatsApp(tenant),
    tenant,
    report: await evaluateReadiness(id, {
      bypassCache: true,
      forceLive: false,
    }),
  });
}
