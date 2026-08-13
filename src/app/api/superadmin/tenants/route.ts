import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  connectWhatsAppDemo,
  createTenant,
  getDb,
  setProcessEnabled,
} from "@/lib/store/db";
import { ProcessKey } from "@/lib/types";
import {
  getUserByEmail,
  linkUserToTenant,
  registerOwner,
} from "@/lib/auth/local-store";
import {
  requireSuperadminContext,
  switchActiveTenant,
} from "@/lib/auth/tenant-context";

export async function GET() {
  const ctx = await requireSuperadminContext();
  if (!ctx.ok) return ctx.response;
  const db = await getDb();
  return NextResponse.json({
    tenants: db.tenants,
    activeTenantId: db.activeTenantId,
  });
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
  ownerEmail: z.string().email().optional(),
  ownerPassword: z.string().min(6).optional(),
  connectDemoWhatsapp: z.boolean().default(true),
  enableWaveA: z.boolean().default(true),
  enableWaveB: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const ctx = await requireSuperadminContext();
  if (!ctx.ok) return ctx.response;

  const body = CreateSchema.parse(await req.json());
  let tenant = await createTenant({
    businessName: body.businessName,
    ownerName: body.ownerName,
    phone: body.phone,
    vertical: body.vertical,
  });

  if (body.connectDemoWhatsapp) {
    tenant = await connectWhatsAppDemo(tenant.id);
  }

  const waveA: ProcessKey[] = ["intake", "qualification", "booking"];
  const waveB: ProcessKey[] = ["reminders", "retention"];
  for (const key of waveA) {
    tenant = await setProcessEnabled(tenant.id, key, body.enableWaveA);
  }
  for (const key of waveB) {
    tenant = await setProcessEnabled(tenant.id, key, body.enableWaveB);
  }

  let owner = null;
  let ownerNote: string | null = null;
  if (body.ownerEmail) {
    const existing = await getUserByEmail(body.ownerEmail);
    if (existing) {
      owner = await linkUserToTenant(existing.id, tenant.id);
      ownerNote = "linked_existing_user";
    } else if (body.ownerPassword) {
      try {
        owner = await registerOwner({
          email: body.ownerEmail,
          password: body.ownerPassword,
          name: body.ownerName,
          tenantId: tenant.id,
        });
        await linkUserToTenant(owner.id, tenant.id);
        ownerNote = "created_owner";
      } catch (e) {
        ownerNote = e instanceof Error ? e.message : "owner_create_failed";
      }
    } else {
      ownerNote = "owner_password_required_for_new_user";
    }
  }

  return NextResponse.json(
    { tenant, owner, ownerNote },
    { status: 201 },
  );
}

const PatchSchema = z.object({
  action: z.literal("activate"),
  tenantId: z.string().min(1),
});

/** Switch which tenant the superadmin dashboard operates on. */
export async function PATCH(req: NextRequest) {
  const ctx = await requireSuperadminContext();
  if (!ctx.ok) return ctx.response;
  const body = PatchSchema.parse(await req.json());
  try {
    const tenant = await switchActiveTenant(body.tenantId);
    return NextResponse.json({ tenant, activeTenantId: tenant.id });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
