import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  ADMIN_GATE_COOKIE,
  adminGatePasswordMatches,
  adminGateToken,
} from "@/lib/auth/admin-gate";

const Body = z.object({ password: z.string().min(1) });

export async function POST(req: NextRequest) {
  const token = adminGateToken();
  if (!token) {
    return NextResponse.json({ error: "gate_not_configured" }, { status: 503 });
  }
  const body = Body.parse(await req.json());
  if (!adminGatePasswordMatches(body.password)) {
    return NextResponse.json({ error: "wrong_password" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_GATE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_GATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
