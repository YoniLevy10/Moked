import { NextResponse } from "next/server";
import { getActiveTenant } from "@/lib/store/db";

export async function GET() {
  const tenant = await getActiveTenant();
  if (!tenant) {
    return NextResponse.json({ connected: false, reason: "no_tenant" });
  }
  return NextResponse.json({
    connected: tenant.whatsapp.connected,
    mode: tenant.whatsapp.mode,
    displayPhone: tenant.whatsapp.displayPhone,
    connectedAt: tenant.whatsapp.connectedAt,
  });
}
