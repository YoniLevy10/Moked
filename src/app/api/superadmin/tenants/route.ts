import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperadmin } from "@/lib/auth/session";
import {
  connectWhatsAppDemo,
  createTenant,
  getDb,
  setProcessEnabled,
} from "@/lib/store/db";
import { ProcessKey } from "@/lib/types";
import { registerOwner, linkUserToTenant } from "@/lib/auth/local-store";

export async function GET() {
  try {
    await requireSuperadmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
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
  try {
    await requireSuperadmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

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
  if (body.ownerEmail && body.ownerPassword) {
    try {
      owner = await registerOwner({
        email: body.ownerEmail,
        password: body.ownerPassword,
        name: body.ownerName,
        tenantId: tenant.id,
      });
    } catch {
      // If email exists, still link if we can find — skip for MVP
      owner = null;
    }
    if (owner) {
      await linkUserToTenant(owner.id, tenant.id);
    }
  }

  return NextResponse.json({ tenant, owner }, { status: 201 });
}
