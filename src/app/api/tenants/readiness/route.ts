import { NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/auth/tenant-context";
import { evaluateReadiness } from "@/lib/product/readiness";

export async function GET() {
  const ctx = await requireTenantContext();
  if (!ctx.ok) return ctx.response;
  const report = await evaluateReadiness(ctx.tenant.id);
  return NextResponse.json(report);
}
