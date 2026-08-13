import { NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/auth/tenant-context";

export async function GET() {
  const ctx = await requireTenantContext();
  if (!ctx.ok) return ctx.response;
  const { tenant } = ctx;
  return NextResponse.json({
    connected: tenant.whatsapp.connected,
    mode: tenant.whatsapp.mode,
    displayPhone: tenant.whatsapp.displayPhone,
    connectedAt: tenant.whatsapp.connectedAt,
    phoneNumberId: tenant.whatsapp.phoneNumberId,
    wabaId: tenant.whatsapp.wabaId,
  });
}
