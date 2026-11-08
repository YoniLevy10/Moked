import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getSessionUser,
  requireSessionUser,
  setSessionCookie,
} from "@/lib/auth/session";
import {
  createTenant,
  getDb,
  updateTenant,
} from "@/lib/store/db";
import { linkUserToTenant } from "@/lib/auth/local-store";
import {
  requireTenantContext,
  resolveTenantForUser,
} from "@/lib/auth/tenant-context";
import {
  applyOwnerProfilePatch,
  OwnerProfilePatchSchema,
} from "@/lib/product/owner-profile";
import { seedKnowledgeFromTenant } from "@/lib/agent/knowledge";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const active = await resolveTenantForUser(user);
  const db = await getDb();
  // Owners only see their tenant; superadmin sees all.
  const tenants =
    user.role === "superadmin"
      ? db.tenants
      : db.tenants.filter((t) => t.id === user.tenantId);
  return NextResponse.json({ active, tenants, user });
}

const CreateSchema = z.object({
  businessName: z.string().min(2),
  ownerName: z.string().min(2),
  phone: z.string().min(9),
  vertical: z.enum([
    "clinic",
    "trades",
    "coach",
    "beauty",
    "realty",
    "other",
  ]),
  tradeKind: z
    .enum(["renovation", "hvac", "electrical", "plumbing", "handyman"])
    .optional(),
});

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireSessionUser();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Owners already linked to a tenant shouldn't create another via self-serve.
  if (user.role === "owner" && user.tenantId) {
    return NextResponse.json(
      { error: "already_has_tenant", message: "כבר מקושרים לעסק" },
      { status: 400 },
    );
  }

  const body = CreateSchema.parse(await req.json());
  const tenant = await createTenant(body);
  const { resolveVerticalPack } = await import("@/lib/verticals/registry");
  if (resolveVerticalPack(tenant.vertical)) {
    const { seedKnowledgeFromTenant } = await import("@/lib/agent/knowledge");
    await seedKnowledgeFromTenant(tenant, body.tradeKind);
  }
  await linkUserToTenant(user.id, tenant.id);
  // Refresh cookie role/tenant by re-setting session with updated tenantId
  await setSessionCookie({ ...user, tenantId: tenant.id });
  return NextResponse.json({ tenant }, { status: 201 });
}

/** Owner + Managed share this PATCH — business, pricing, policy answers, hours. */
const PatchSchema = OwnerProfilePatchSchema;

export async function PATCH(req: NextRequest) {
  const ctx = await requireTenantContext();
  if (!ctx.ok) return ctx.response;
  const body = PatchSchema.parse(await req.json());
  const patch = applyOwnerProfilePatch(ctx.tenant, body);
  const tenant = await updateTenant(ctx.tenant.id, patch);
  if (body.pricing || body.botAnswers) {
    await seedKnowledgeFromTenant(tenant);
  }
  return NextResponse.json({ tenant });
}
