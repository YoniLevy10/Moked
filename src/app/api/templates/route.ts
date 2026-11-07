import { NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/auth/tenant-context";
import {
  listTemplates,
  refreshPendingTemplates,
  seedAndSubmitUtilities,
} from "@/lib/templates/service";
import { HEBREW_UTILITY_SEEDS } from "@/lib/templates/seeds";

export async function GET() {
  const ctx = await requireTenantContext();
  if (!ctx.ok) return ctx.response;
  const templates = await refreshPendingTemplates(ctx.tenant.id);
  return NextResponse.json({
    templates,
    seeds: HEBREW_UTILITY_SEEDS.map((s) => ({
      name: s.name,
      language: s.language,
      category: s.category,
      body: s.body,
    })),
  });
}

export async function POST() {
  const ctx = await requireTenantContext();
  if (!ctx.ok) return ctx.response;
  const templates = await seedAndSubmitUtilities(ctx.tenant.id);
  return NextResponse.json({ templates });
}
