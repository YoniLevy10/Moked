import { NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/auth/tenant-context";
import { cancelSubscription } from "@/lib/product/billing";

export async function POST() {
  const ctx = await requireTenantContext();
  if (!ctx.ok) return ctx.response;
  const result = await cancelSubscription(ctx.tenant.id);
  return NextResponse.json({ status: result.tenant.subscription.status });
}
