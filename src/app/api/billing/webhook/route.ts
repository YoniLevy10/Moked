import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { applyBillingEvent, verifyBillingSignature } from "@/lib/product/billing";

const Body = z.object({
  tenantId: z.string().min(1),
  status: z.enum(["active", "past_due", "canceled"]),
  externalId: z.string().optional(),
  invoiceId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyBillingSignature(raw, req.headers.get("x-moked-signature"))) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }
  const parsed = Body.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const result = await applyBillingEvent(parsed.data);
  return NextResponse.json({
    status: result.tenant.subscription.status,
    renewsAt: result.tenant.subscription.renewsAt ?? null,
    numberStatus: result.number?.status ?? null,
  });
}
