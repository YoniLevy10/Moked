import { NextRequest, NextResponse } from "next/server";
import { requireSuperadminContext } from "@/lib/auth/tenant-context";
import {
  bustReadinessCache,
  evaluateReadiness,
} from "@/lib/product/readiness";
import { getTenantById, updateTenant } from "@/lib/store/db";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const ctx = await requireSuperadminContext();
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  const tenant = await getTenantById(id);
  if (!tenant) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  bustReadinessCache(id);
  const report = await evaluateReadiness(id, { bypassCache: true });
  if (!report.ready) {
    return NextResponse.json(
      {
        error: "tenant_not_ready",
        ready: false,
        checks: report.checks.filter((c) => c.blocking && !c.ok),
      },
      { status: 409 },
    );
  }

  // Mark go-live intent on WhatsApp mode when already connected.
  if (tenant.whatsapp.connected && tenant.whatsapp.mode !== "live") {
    await updateTenant(id, {
      whatsapp: { ...tenant.whatsapp, mode: "live" },
    });
  }
  bustReadinessCache(id);

  return NextResponse.json({
    ok: true,
    ready: true,
    report: await evaluateReadiness(id, { bypassCache: true }),
  });
}
