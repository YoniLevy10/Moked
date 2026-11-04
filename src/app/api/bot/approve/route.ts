import { NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/auth/tenant-context";
import { updateTenant } from "@/lib/store/db";

export async function POST() {
  const ctx = await requireTenantContext();
  if (!ctx.ok) return ctx.response;
  const draft = ctx.tenant.bot.draft.trim();
  if (!draft) {
    return NextResponse.json({ error: "draft_empty" }, { status: 400 });
  }
  const saved = await updateTenant(ctx.tenant.id, {
    bot: {
      ...ctx.tenant.bot,
      approved: draft,
      approvedAt: new Date().toISOString(),
    },
  });
  return NextResponse.json({
    approved: Boolean(saved.bot.approved),
    approvedAt: saved.bot.approvedAt,
  });
}
