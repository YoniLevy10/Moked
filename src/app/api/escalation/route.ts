import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantContext } from "@/lib/auth/tenant-context";
import { seedKnowledgeFromTenant } from "@/lib/agent/knowledge";
import {
  applyOwnerProfilePatch,
  escalationPolicySnapshot,
} from "@/lib/product/owner-profile";
import { updateTenant } from "@/lib/store/db";

const PatchSchema = z.object({
  handoff: z.string().optional(),
  forbidden: z.string().optional(),
});

/**
 * Escalation rules editor — owner + Managed share this path.
 * Thresholds come from agent SoT / env (read-only); owners edit handoff/forbidden copy.
 */
export async function GET() {
  const ctx = await requireTenantContext();
  if (!ctx.ok) return ctx.response;
  return NextResponse.json({
    policy: escalationPolicySnapshot(),
    answers: {
      handoff: ctx.tenant.bot.answers.handoff ?? "",
      forbidden: ctx.tenant.bot.answers.forbidden ?? "",
      hours: ctx.tenant.bot.answers.hours ?? "",
    },
  });
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireTenantContext();
  if (!ctx.ok) return ctx.response;
  const body = PatchSchema.parse(await req.json());
  const patch = applyOwnerProfilePatch(ctx.tenant, {
    botAnswers: {
      handoff: body.handoff,
      forbidden: body.forbidden,
    },
  });
  const tenant = await updateTenant(ctx.tenant.id, patch);
  await seedKnowledgeFromTenant(tenant);
  return NextResponse.json({
    tenant,
    policy: escalationPolicySnapshot(),
    answers: {
      handoff: tenant.bot.answers.handoff ?? "",
      forbidden: tenant.bot.answers.forbidden ?? "",
      hours: tenant.bot.answers.hours ?? "",
    },
  });
}
