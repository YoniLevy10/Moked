import { NextRequest, NextResponse } from "next/server";
import { handlePspWebhook } from "@/lib/integrations/psp-webhook";

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const result = await handlePspWebhook({
    rawBody: raw,
    signatureHeader: req.headers.get("x-moked-signature"),
    preferredProvider: process.env.MOKED_BILLING_PROVIDER,
  });

  if (!result.ok) {
    if (result.error === "invalid_signature") {
      return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
    }
    if (result.error === "not_found") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    replay: result.replay,
    kind: result.replay ? undefined : result.kind,
    status: result.replay ? undefined : result.status,
  });
}
