import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantContext } from "@/lib/auth/tenant-context";
import {
  deleteTenantKnowledge,
  listTenantKnowledge,
  newKnowledgeId,
  seedKnowledgeFromTenant,
  upsertTenantKnowledge,
} from "@/lib/agent/knowledge";
import { getTenantById } from "@/lib/store/db";

const KindSchema = z.enum([
  "service",
  "price",
  "hours",
  "area",
  "policy",
  "faq",
  "forbidden",
]);

const UpsertSchema = z.object({
  id: z.string().min(1).optional(),
  kind: KindSchema,
  label: z.string().min(1),
  body: z.string().min(1),
  meta: z.record(z.string(), z.unknown()).optional(),
});

const DeleteSchema = z.object({
  id: z.string().min(1),
});

/** Owner + Managed/superadmin (active tenant) — same knowledge CMS path. */
export async function GET() {
  const ctx = await requireTenantContext();
  if (!ctx.ok) return ctx.response;
  const rows = await listTenantKnowledge(ctx.tenant.id);
  return NextResponse.json({ knowledge: rows });
}

export async function POST(req: NextRequest) {
  const ctx = await requireTenantContext();
  if (!ctx.ok) return ctx.response;
  const body = UpsertSchema.parse(await req.json());
  const row = await upsertTenantKnowledge({
    id: body.id ?? newKnowledgeId(),
    tenantId: ctx.tenant.id,
    kind: body.kind,
    label: body.label.trim(),
    body: body.body.trim(),
    meta: body.meta ?? {},
  });
  return NextResponse.json({ row }, { status: body.id ? 200 : 201 });
}

export async function DELETE(req: NextRequest) {
  const ctx = await requireTenantContext();
  if (!ctx.ok) return ctx.response;
  const body = DeleteSchema.parse(await req.json());
  const ok = await deleteTenantKnowledge(ctx.tenant.id, body.id);
  if (!ok) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

/** Re-seed from current tenant pricing + bot answers + vertical pack. */
export async function PUT() {
  const ctx = await requireTenantContext();
  if (!ctx.ok) return ctx.response;
  const fresh = (await getTenantById(ctx.tenant.id)) ?? ctx.tenant;
  const rows = await seedKnowledgeFromTenant(fresh);
  return NextResponse.json({ knowledge: rows });
}
