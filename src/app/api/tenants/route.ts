import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createTenant, getActiveTenant, getDb, updateTenant } from "@/lib/store/db";

export async function GET() {
  const db = await getDb();
  const active = await getActiveTenant();
  return NextResponse.json({ active, tenants: db.tenants });
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
});

export async function POST(req: NextRequest) {
  const body = CreateSchema.parse(await req.json());
  const tenant = await createTenant(body);
  return NextResponse.json({ tenant }, { status: 201 });
}

const PatchSchema = z.object({
  integrations: z
    .object({
      googleCalendar: z.boolean().optional(),
      paymentsProvider: z
        .enum(["none", "grow", "payplus", "tranzila", "cardcom"])
        .optional(),
      invoicingProvider: z
        .enum(["none", "icount", "morning", "greeninvoice"])
        .optional(),
      googleReviewsUrl: z.string().optional(),
    })
    .optional(),
});

export async function PATCH(req: NextRequest) {
  const active = await getActiveTenant();
  if (!active) {
    return NextResponse.json({ error: "no_tenant" }, { status: 400 });
  }
  const body = PatchSchema.parse(await req.json());
  const tenant = await updateTenant(active.id, {
    integrations: {
      ...active.integrations,
      ...(body.integrations ?? {}),
    },
  });
  return NextResponse.json({ tenant });
}
