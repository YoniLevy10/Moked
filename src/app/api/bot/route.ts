import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantContext } from "@/lib/auth/tenant-context";
import { rewriteInstructions } from "@/lib/product/bot";
import { updateTenant } from "@/lib/store/db";

const Body = z.object({
  what: z.string().default(""),
  hours: z.string().default(""),
  forbidden: z.string().default(""),
  handoff: z.string().default(""),
  pasted: z.string().default(""),
});

export async function POST(req: NextRequest) {
  const ctx = await requireTenantContext();
  if (!ctx.ok) return ctx.response;
  const answers = Body.parse(await req.json());
  const drafted = await updateTenant(ctx.tenant.id, {
    bot: { ...ctx.tenant.bot, answers, draft: ctx.tenant.bot.draft },
  });
  const draft = await rewriteInstructions(drafted);
  const saved = await updateTenant(ctx.tenant.id, {
    bot: { ...drafted.bot, draft },
  });
  return NextResponse.json({ draft: saved.bot.draft });
}
