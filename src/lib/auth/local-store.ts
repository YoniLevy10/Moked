import {
  AuthUser,
  isAdminEmail,
  normalizeEmail,
} from "@/lib/auth/shared";
import {
  getSupabaseAdmin,
  getSupabaseAnon,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/server";
import * as fileAuth from "@/lib/auth/file-auth";

type ProfileRow = {
  id: string;
  email: string;
  name: string;
  role: AuthUser["role"];
  tenant_id: string | null;
  created_at: string;
};

function useRemote(): boolean {
  return isSupabaseAdminConfigured();
}

function mapProfile(row: ProfileRow): AuthUser {
  const user: AuthUser = {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    tenantId: row.tenant_id ?? undefined,
    createdAt: row.created_at,
  };
  if (isAdminEmail(user.email)) user.role = "superadmin";
  return user;
}

async function getProfileById(id: string): Promise<AuthUser | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapProfile(data as ProfileRow);
}

async function getProfileByEmail(email: string): Promise<AuthUser | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("profiles")
    .select("*")
    .eq("email", normalizeEmail(email))
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapProfile(data as ProfileRow);
}

async function ensureProfile(input: {
  id: string;
  email: string;
  name: string;
  role?: AuthUser["role"];
  tenantId?: string;
}): Promise<AuthUser> {
  const sb = getSupabaseAdmin();
  const email = normalizeEmail(input.email);
  const role =
    input.role ??
    (isAdminEmail(email) ? ("superadmin" as const) : ("owner" as const));

  const { error } = await sb.from("profiles").upsert(
    {
      id: input.id,
      email,
      name: input.name,
      role,
      tenant_id: input.tenantId ?? null,
    },
    { onConflict: "id" },
  );
  if (error) throw error;

  if (input.tenantId) {
    await sb.from("profiles").update({ tenant_id: input.tenantId }).eq("id", input.id);
  }
  if (role === "superadmin" || isAdminEmail(email)) {
    await sb.from("profiles").update({ role: "superadmin" }).eq("id", input.id);
  }

  const user = await getProfileById(input.id);
  if (!user) throw new Error("profile_missing");
  return user;
}

/** Ensures bootstrap superadmin exists when ADMIN_EMAILS is set. */
export async function ensureBootstrapAdmin(): Promise<void> {
  if (!useRemote()) return fileAuth.ensureBootstrapAdmin();

  const email = process.env.ADMIN_EMAILS?.split(",")[0]?.trim();
  if (!email) return;

  const existing = await getProfileByEmail(email);
  if (existing) {
    if (existing.role !== "superadmin") {
      const sb = getSupabaseAdmin();
      await sb
        .from("profiles")
        .update({ role: "superadmin" })
        .eq("id", existing.id);
    }
    return;
  }

  const password =
    process.env.ADMIN_BOOTSTRAP_PASSWORD || "moked-admin-change-me";
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.auth.admin.createUser({
    email: normalizeEmail(email),
    password,
    email_confirm: true,
    user_metadata: { name: "Super Admin" },
  });
  if (error) {
    // Already exists in auth but missing profile
    const { data: listed } = await sb.auth.admin.listUsers({ perPage: 200 });
    const found = listed?.users?.find(
      (u) => normalizeEmail(u.email ?? "") === normalizeEmail(email),
    );
    if (!found) throw error;
    await ensureProfile({
      id: found.id,
      email,
      name: "Super Admin",
      role: "superadmin",
    });
    return;
  }
  if (!data.user) throw new Error("bootstrap_admin_failed");
  await ensureProfile({
    id: data.user.id,
    email,
    name: "Super Admin",
    role: "superadmin",
  });
}

export async function registerOwner(input: {
  email: string;
  password: string;
  name: string;
  tenantId?: string;
}): Promise<AuthUser> {
  if (!useRemote()) return fileAuth.registerOwner(input);

  const email = normalizeEmail(input.email);
  const existing = await getProfileByEmail(email);
  if (existing) throw new Error("email_taken");

  const sb = getSupabaseAdmin();
  const role = isAdminEmail(email) ? ("superadmin" as const) : ("owner" as const);
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { name: input.name.trim() || email.split("@")[0] },
  });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("register_failed");

  return ensureProfile({
    id: data.user.id,
    email,
    name: input.name.trim() || email.split("@")[0],
    role,
    tenantId: input.tenantId,
  });
}

export async function authenticateLocal(
  email: string,
  password: string,
): Promise<AuthUser | null> {
  if (!useRemote()) return fileAuth.authenticateLocal(email, password);

  await ensureBootstrapAdmin();
  const anon = getSupabaseAnon();
  if (!anon) return null;

  const { data, error } = await anon.auth.signInWithPassword({
    email: normalizeEmail(email),
    password,
  });
  if (error || !data.user) return null;

  let user = await getProfileById(data.user.id);
  if (!user) {
    user = await ensureProfile({
      id: data.user.id,
      email: data.user.email ?? email,
      name:
        (data.user.user_metadata?.name as string) ||
        email.split("@")[0],
    });
  }
  return user;
}

export async function getUserById(id: string): Promise<AuthUser | null> {
  if (!useRemote()) return fileAuth.getUserById(id);
  await ensureBootstrapAdmin();
  return getProfileById(id);
}

export async function getUserByEmail(email: string): Promise<AuthUser | null> {
  if (!useRemote()) return fileAuth.getUserByEmail(email);
  await ensureBootstrapAdmin();
  return getProfileByEmail(email);
}

/** Upsert a profile after Supabase login so sessions resolve. */
export async function upsertExternalUser(input: {
  id: string;
  email: string;
  name: string;
  role?: AuthUser["role"];
  tenantId?: string;
}): Promise<AuthUser> {
  if (!useRemote()) return fileAuth.upsertExternalUser(input);
  return ensureProfile(input);
}

export async function listUsers(): Promise<AuthUser[]> {
  if (!useRemote()) return fileAuth.listUsers();
  await ensureBootstrapAdmin();
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as ProfileRow[]).map(mapProfile);
}

export async function linkUserToTenant(
  userId: string,
  tenantId: string,
): Promise<AuthUser> {
  if (!useRemote()) return fileAuth.linkUserToTenant(userId, tenantId);
  const sb = getSupabaseAdmin();
  const { error } = await sb
    .from("profiles")
    .update({ tenant_id: tenantId })
    .eq("id", userId);
  if (error) throw error;
  const user = await getProfileById(userId);
  if (!user) throw new Error("user_not_found");
  return user;
}
