import { NextRequest, NextResponse } from "next/server";
import { tradesLandingCopy, TRADE_PACKS } from "@/lib/trades/pack";

/** Public trades beachhead copy (ads / landing) — no secrets. */
export async function GET(req: NextRequest) {
  const kind = req.nextUrl.searchParams.get("kind");
  if (kind) {
    return NextResponse.json({ pack: tradesLandingCopy(kind) });
  }
  return NextResponse.json({
    packs: Object.values(TRADE_PACKS).map((p) => ({
      kind: p.kind,
      labelHe: p.labelHe,
      landingHeadline: p.landingHeadline,
      landingSub: p.landingSub,
      adLines: p.adLines,
    })),
  });
}
