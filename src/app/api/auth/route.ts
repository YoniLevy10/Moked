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
import { hasNeon } from "@/lib/db/remote";
import { isAdminEmail, isSupabaseAuthConfigured, isSupabaseDbConfigured } from "@/lib/auth/shared";
import { getSupabaseAuthClient } from "@/lib/auth/supabase";

function publicAuthError(value: unknown): string {
  const raw =
    value instanceof Error
      ? value.message
      : value && typeof value === "object" && "message" in value
        ? String((value as { message: unknown }).message)
        : "";
  const known: Record<string, string> = {
    email_taken: "כבר יש חשבון עם האימייל הזה. אפשר להתחבר.",
    invalid_credentials: "האימייל או הסיסמה לא נכונים.",
    email_password_required: "צריך אימייל וסיסמה.",
    register_failed: "לא הצלחנו ליצור את החשבון. נסו שוב.",
  };
  if (known[raw]) return known[raw];
  if (/fetch failed|ENOTFOUND|getaddrinfo/i.test(raw)) {
    return "שירות החשבונות לא זמין כרגע. נסו שוב בעוד רגע.";
  }
  return "לא הצלחנו להשלים את הפעולה. נסו שוב.";
}

function persistenceMode(): "neon" | "supabase" | "local" {
  if (hasNeon()) return "neon";
  if (isSupabaseDbConfigured()) return "supabase";
  return "local";
}

export async function GET() {
  await ensureBootstrapAdmin();
  const user = await getSessionUser();
  return NextResponse.json({
    user,
    supabaseConfigured: isSupabaseAuthConfigured(),
    db: persistenceMode() === "local" ? "file" : persistenceMode(),
    mode: persistenceMode(),
  });
}

const Body = z.object({
  action: z.enum(["login", "register", "logout"]),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  name: z.string().optional(),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json(
      { error: "הפרטים שנשלחו לא תקינים." },
      { status: 400 },
    );
  }

  if (body.action === "logout") {
    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  }

  if (!body.email || !body.password) {
    return NextResponse.json(
      { error: publicAuthError(new Error("email_password_required")) },
      { status: 400 },
    );
  }

  // An external auth host is optional. Accounts live in the app database.
  const supabase = getSupabaseAuthClient();
  if (supabase && body.action === "login") {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: body.email,
        password: body.password,
      });
      if (!error && data.user) {
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
    } catch (e) {
      console.error(
        "supabase_login_failed",
        e instanceof Error ? e.message : "unknown",
      );
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
        { user, mode: persistenceMode() },
        { status: 201 },
      );
    } catch (e) {
      console.error("register_failed", e instanceof Error ? e.message : "unknown");
      return NextResponse.json({ error: publicAuthError(e) }, { status: 400 });
    }
  }

  const user = await authenticateLocal(body.email, body.password);
  if (!user) {
    return NextResponse.json(
      { error: publicAuthError(new Error("invalid_credentials")) },
      { status: 401 },
    );
  }
  await setSessionCookie(user);
  return NextResponse.json({ user, mode: persistenceMode() });
}
