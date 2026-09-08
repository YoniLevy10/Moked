import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  authenticateLocal,
  ensureBootstrapAdmin,
  registerOwner,
  upsertExternalUser,
} from "@/lib/auth/local-store";
import {
  clearSessionCookie,
  getSessionUser,
  setSessionCookie,
} from "@/lib/auth/session";
import { isAdminEmail, isSupabaseAuthConfigured, isSupabaseDbConfigured } from "@/lib/auth/shared";
import { getSupabaseAuthClient } from "@/lib/auth/supabase";

export async function GET() {
  await ensureBootstrapAdmin();
  const user = await getSessionUser();
  return NextResponse.json({
    user,
    supabaseConfigured: isSupabaseAuthConfigured(),
    db: isSupabaseDbConfigured() ? "supabase" : "file",
    mode: isSupabaseDbConfigured() ? "supabase" : "local",
  });
}

const Body = z.object({
  action: z.enum(["login", "register", "logout"]),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  name: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = Body.parse(await req.json());

  if (body.action === "logout") {
    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  }

  if (!body.email || !body.password) {
    return NextResponse.json(
      { error: "email_password_required" },
      { status: 400 },
    );
  }

  // Prefer Supabase when configured (same pattern as Fixly/OpsBrain).
  const supabase = getSupabaseAuthClient();
  if (supabase && body.action === "login") {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });
    if (error || !data.user) {
      // Fall through to local demo auth so bootstrap admin still works.
    } else {
      const email = data.user.email ?? body.email;
      const user = await upsertExternalUser({
        id: data.user.id,
        email,
        name:
          (data.user.user_metadata?.full_name as string) ||
          body.email.split("@")[0],
        role: isAdminEmail(email) ? "superadmin" : "owner",
      });
      await setSessionCookie(user);
      return NextResponse.json({ user, mode: "supabase" });
    }
  }

  if (body.action === "register") {
    try {
      const user = await registerOwner({
        email: body.email,
        password: body.password,
        name: body.name || body.email.split("@")[0],
      });
      await setSessionCookie(user);
      return NextResponse.json(
        { user, mode: isSupabaseDbConfigured() ? "supabase" : "local" },
        { status: 201 },
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  const user = await authenticateLocal(body.email, body.password);
  if (!user) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }
  await setSessionCookie(user);
  return NextResponse.json({ user, mode: "local" });
}
