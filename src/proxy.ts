import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE = "moked_session";

async function sessionTokenFor(userId: string): Promise<string> {
  const secret = process.env.AUTH_SECRET || "moked-dev-secret";
  const data = new TextEncoder().encode(`${userId}:${secret}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hasValidSession(req: NextRequest): Promise<boolean> {
  const raw = req.cookies.get(COOKIE)?.value;
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as { uid?: string; token?: string };
    if (!parsed.uid || !parsed.token) return false;
    const expected = await sessionTokenFor(parsed.uid);
    return expected === parsed.token;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const protectedPath =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/superadmin");

  if (!protectedPath) return NextResponse.next();

  if (!(await hasValidSession(request))) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding", "/onboarding/:path*", "/superadmin", "/superadmin/:path*"],
};
