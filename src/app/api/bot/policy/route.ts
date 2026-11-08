import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantContext } from "@/lib/auth/tenant-context";
import { seedKnowledgeFromTenant } from "@/lib/agent/knowledge";
import { rewriteInstructions } from "@/lib/product/bot";
import { applyOwnerProfilePatch } from "@/lib/product/owner-profile";
import { updateTenant } from "@/lib/store/db";

const Body = z.object({
  what: z.string().optional(),
  hours: z.string().optional(),
  forbidden: z.string().optional(),
  handoff: z.string().optional(),
  pasted: z.string().optional(),
  /** When true, also polish + leave draft (approve still separate). */
  rewrite: z.boolean().optional(),
});

/**
 * Agent policy editor — same path for owner and Managed/superadmin.
 * Writes bot.answers and mirrors into tenant_knowledge.
 */
export async function GET() {
  const ctx = await requireTenantContext();
  if (!ctx.ok) return ctx.response;
  return NextResponse.json({
    answers: ctx.tenant.bot.answers,
    draft: ctx.tenant.bot.draft,
    approved: ctx.tenant.bot.approved ?? null,
    approvedAt: ctx.tenant.bot.approvedAt ?? null,
  });
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireTenantContext();
  if (!ctx.ok) return ctx.response;
  const body = Body.parse(await req.json());
  const { rewrite, ...answers } = body;
  let tenant = await updateTenant(
    ctx.tenant.id,
    applyOwnerProfilePatch(ctx.tenant, { botAnswers: answers }),
  );
  if (rewrite !== false) {
    const draft = await rewriteInstructions(tenant);
    tenant = await updateTenant(ctx.tenant.id, {
      bot: { ...tenant.bot, draft },
    });
  }
  await seedKnowledgeFromTenant(tenant);
  return NextResponse.json({
    answers: tenant.bot.answers,
    draft: tenant.bot.draft,
    approved: tenant.bot.approved ?? null,
    tenant,
  });
}
