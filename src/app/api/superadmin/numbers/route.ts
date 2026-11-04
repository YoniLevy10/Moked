import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperadminContext } from "@/lib/auth/tenant-context";
import { listPhoneNumbers } from "@/lib/store/db";
import { poolCredentials } from "@/lib/product/meta";
import {
  addPoolNumber,
  beginRegistration,
  markNumberLive,
  submitVerificationCode,
} from "@/lib/product/pool";

export async function GET() {
  const ctx = await requireSuperadminContext();
  if (!ctx.ok) return ctx.response;
  const numbers = (await listPhoneNumbers()).map((phone) => ({
    ...phone,
    pinCipher: undefined,
    lastCode: undefined,
  }));
  return NextResponse.json({
    numbers,
    metaConfigured: Boolean(poolCredentials()),
  });
}

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add"), e164: z.string().min(8) }),
  z.object({
    action: z.literal("register"),
    id: z.string(),
    displayName: z.string().min(2),
  }),
  z.object({ action: z.literal("code"), id: z.string(), code: z.string().min(4) }),
  z.object({ action: z.literal("live"), id: z.string() }),
]);

export async function POST(req: NextRequest) {
  const ctx = await requireSuperadminContext();
  if (!ctx.ok) return ctx.response;
  const body = Body.parse(await req.json());
  try {
    const raw =
      body.action === "add"
        ? await addPoolNumber(body.e164)
        : body.action === "register"
          ? await beginRegistration(body.id, body.displayName)
          : body.action === "code"
            ? await submitVerificationCode(body.id, body.code)
            : await markNumberLive(body.id);
    const number = { ...raw, pinCipher: undefined, lastCode: undefined };
    return NextResponse.json({ number });
  } catch (error) {
    const message = error instanceof Error ? error.message : "error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
