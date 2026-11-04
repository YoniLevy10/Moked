import {
  AuthUser,
  hashPassword,
  isAdminEmail,
  normalizeEmail,
  verifyPassword,
} from "@/lib/auth/shared";
import { getRemote } from "@/lib/db/remote";

type ProfileRow = {
  id: string;
  email: string;
  name: string;
  role: AuthUser["role"];
  tenant_id: string | null;
  password_hash: string | null;
  created_at: string;
};

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

async function profileByEmail(email: string): Promise<ProfileRow | null> {
  const { data, error } = await getRemote()
    .from("profiles")
    .select()
    .eq("email", normalizeEmail(email))
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ProfileRow | null) ?? null;
}

async function profileById(id: string): Promise<ProfileRow | null> {
  const { data, error } = await getRemote()
    .from("profiles")
    .select()
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ProfileRow | null) ?? null;
}

export async function ensureNeonBootstrapAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAILS?.split(",")[0]?.trim();
  if (!email) return;
  const existing = await profileByEmail(email);
  if (existing) {
    if (existing.role !== "superadmin") {
      const { error } = await getRemote()
        .from("profiles")
        .update({ role: "superadmin" })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    }
    return;
  }
  const password =
    process.env.ADMIN_BOOTSTRAP_PASSWORD || "moked-admin-change-me";
  const { error } = await getRemote()
    .from("profiles")
    .insert({
      email: normalizeEmail(email),
      name: "Super Admin",
      role: "superadmin",
      password_hash: hashPassword(password),
    })
    .select();
  if (error) throw new Error(error.message);
}

export async function neonGetUserById(id: string): Promise<AuthUser | null> {
  await ensureNeonBootstrapAdmin();
  const row = await profileById(id);
  return row ? mapProfile(row) : null;
}

export async function neonGetUserByEmail(
  email: string,
): Promise<AuthUser | null> {
  await ensureNeonBootstrapAdmin();
  const row = await profileByEmail(email);
  return row ? mapProfile(row) : null;
}

export async function neonAuthenticate(
  email: string,
  password: string,
): Promise<AuthUser | null> {
  await ensureNeonBootstrapAdmin();
  const row = await profileByEmail(email);
  if (!row?.password_hash) return null;
  if (!verifyPassword(password, row.password_hash)) return null;
  return mapProfile(row);
}

export async function neonRegisterOwner(input: {
  email: string;
  password: string;
  name: string;
  tenantId?: string;
}): Promise<AuthUser> {
  const email = normalizeEmail(input.email);
  if (await profileByEmail(email)) throw new Error("email_taken");
  const role = isAdminEmail(email) ? "superadmin" : "owner";
  const { data, error } = await getRemote()
    .from("profiles")
    .insert({
      email,
      name: input.name.trim() || email.split("@")[0],
      role,
      tenant_id: input.tenantId ?? null,
      password_hash: hashPassword(input.password),
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message || "register_failed");
  return mapProfile(data as ProfileRow);
}

export async function neonLinkUserToTenant(
  userId: string,
  tenantId: string,
): Promise<AuthUser> {
  const { error } = await getRemote()
    .from("profiles")
    .update({ tenant_id: tenantId })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  const row = await profileById(userId);
  if (!row) throw new Error("user_not_found");
  return mapProfile(row);
}

export async function neonListUsers(): Promise<AuthUser[]> {
  await ensureNeonBootstrapAdmin();
  const { data, error } = await getRemote()
    .from("profiles")
    .select()
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as ProfileRow[]).map(mapProfile);
}

export async function neonUpsertUser(input: {
  id: string;
  email: string;
  name: string;
  role?: AuthUser["role"];
  tenantId?: string;
}): Promise<AuthUser> {
  const email = normalizeEmail(input.email);
  const role =
    input.role ?? (isAdminEmail(email) ? "superadmin" : "owner");
  const { error } = await getRemote()
    .from("profiles")
    .upsert(
      {
        id: input.id,
        email,
        name: input.name,
        role,
        tenant_id: input.tenantId ?? null,
      },
      { onConflict: "id" },
    );
  if (error) throw new Error(error.message);
  const row = await profileById(input.id);
  if (!row) throw new Error("profile_missing");
  return mapProfile(row);
}
