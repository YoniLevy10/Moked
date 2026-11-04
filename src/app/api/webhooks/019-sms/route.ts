import { NextRequest, NextResponse } from "next/server";
import { receiveInboundCode } from "@/lib/product/pool";

export async function POST(req: NextRequest) {
  const secret = process.env.O19_SMS_WEBHOOK_SECRET?.trim();
  if (!secret || req.headers.get("x-019-token") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const contentType = req.headers.get("content-type") ?? "";
  const fields = contentType.includes("application/json")
    ? ((await req.json()) as Record<string, string>)
    : Object.fromEntries(await req.formData()) as Record<string, string>;
  const message = String(fields.message ?? "");
  const dest = String(fields.dest ?? fields.destination ?? fields.phone ?? "");
  const code = message.match(/\b(\d{6})\b/)?.[1];
  if (!code) return NextResponse.json({ ok: true, matched: false });
  const number = await receiveInboundCode(dest, code);
  return NextResponse.json({ ok: true, matched: Boolean(number) });
}
