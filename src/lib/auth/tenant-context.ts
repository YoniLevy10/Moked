import { NextResponse } from "next/server";
import { AuthUser } from "@/lib/auth/shared";
import {
  getSessionUser,
  requireSessionUser,
  requireSuperadmin,
} from "@/lib/auth/session";
import {
  getActiveTenant,
  getTenantById,
  setActiveTenantId,
} from "@/lib/store/db";
import { Tenant } from "@/lib/types";

export async function resolveTenantForUser(
  user: AuthUser,
): Promise<Tenant | null> {
  if (user.role === "superadmin") {
    if (user.tenantId) {
      const linked = await getTenantById(user.tenantId);
      if (linked) return linked;
    }
    return getActiveTenant();
  }
  if (user.tenantId) {
    return getTenantById(user.tenantId);
  }
  return null;
}

export async function getSessionTenant(): Promise<{
  user: AuthUser | null;
  tenant: Tenant | null;
}> {
  const user = await getSessionUser();
  if (!user) return { user: null, tenant: null };
  const tenant = await resolveTenantForUser(user);
  return { user, tenant };
}

/** API helper: require login and resolve the caller's tenant. */
export async function requireTenantContext(): Promise<
  | { ok: true; user: AuthUser; tenant: Tenant }
  | { ok: false; response: NextResponse }
> {
  try {
    const user = await requireSessionUser();
    const tenant = await resolveTenantForUser(user);
    if (!tenant) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "no_tenant", message: "אין עסק מקושר למשתמש. השלימו הקמה." },
          { status: 400 },
        ),
      };
    }
    return { ok: true, user, tenant };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }
}

export async function requireSuperadminContext(): Promise<
  | { ok: true; user: AuthUser }
  | { ok: false; response: NextResponse }
> {
  try {
    const user = await requireSuperadmin();
    return { ok: true, user };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "forbidden";
    const status = msg === "unauthorized" ? 401 : 403;
    return {
      ok: false,
      response: NextResponse.json({ error: msg }, { status }),
    };
  }
}

/** Superadmin switches which tenant the dashboard APIs see. */
export async function switchActiveTenant(tenantId: string): Promise<Tenant> {
  return setActiveTenantId(tenantId);
}
