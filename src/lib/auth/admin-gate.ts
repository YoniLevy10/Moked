import { createHash, createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_GATE_COOKIE = "moked_admin_gate";

function passwordDigest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function adminGatePasswordMatches(input: string): boolean {
  const expected = process.env.ADMIN_GATE_PASSWORD ?? "";
  if (!expected) return false;
  return timingSafeEqual(passwordDigest(input), passwordDigest(expected));
}

export function adminGateToken(): string | null {
  const password = process.env.ADMIN_GATE_PASSWORD;
  if (!password) return null;
  const secret = process.env.AUTH_SECRET || "moked-dev-secret";
  return createHmac("sha256", secret).update(`admin-gate:${password}`).digest("hex");
}

export async function hasAdminGate(): Promise<boolean> {
  const expected = adminGateToken();
  if (!expected) return false;
  const jar = await cookies();
  const given = jar.get(ADMIN_GATE_COOKIE)?.value ?? "";
  if (!given) return false;
  return timingSafeEqual(passwordDigest(given), passwordDigest(expected));
}
