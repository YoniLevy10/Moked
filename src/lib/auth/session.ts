import { cookies } from "next/headers";
import {
  AuthUser,
  isAdminEmail,
  sessionTokenFor,
} from "@/lib/auth/shared";
import { getUserById } from "@/lib/auth/local-store";

const COOKIE = "moked_session";

export async function setSessionCookie(user: AuthUser): Promise<void> {
  const jar = await cookies();
  const token = sessionTokenFor(user.id);
  jar.set(
    COOKIE,
    JSON.stringify({ uid: user.id, token }),
    {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
    },
  );
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSessionUser(): Promise<AuthUser | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { uid?: string; token?: string };
    if (!parsed.uid || !parsed.token) return null;
    if (parsed.token !== sessionTokenFor(parsed.uid)) return null;
    const user = await getUserById(parsed.uid);
    if (!user) return null;
    if (isAdminEmail(user.email)) user.role = "superadmin";
    return user;
  } catch {
    return null;
  }
}

export async function requireSessionUser(): Promise<AuthUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("unauthorized");
  return user;
}

export async function requireSuperadmin(): Promise<AuthUser> {
  const user = await requireSessionUser();
  if (user.role !== "superadmin" && !isAdminEmail(user.email)) {
    throw new Error("forbidden");
  }
  return user;
}
