import { promises as fs } from "fs";
import path from "path";
import { nanoid } from "nanoid";
import {
  AuthUser,
  hashPassword,
  isAdminEmail,
  normalizeEmail,
  verifyPassword,
} from "@/lib/auth/shared";

const DATA_DIR = path.join(process.cwd(), ".data");
const AUTH_FILE = path.join(DATA_DIR, "auth.json");

type AuthDb = {
  users: Array<AuthUser & { passwordHash: string }>;
};

async function readAuth(): Promise<AuthDb> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    return JSON.parse(await fs.readFile(AUTH_FILE, "utf8")) as AuthDb;
  } catch {
    const empty: AuthDb = { users: [] };
    await fs.writeFile(AUTH_FILE, JSON.stringify(empty, null, 2));
    return empty;
  }
}

async function writeAuth(db: AuthDb): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(AUTH_FILE, JSON.stringify(db, null, 2));
}

function toPublic(user: AuthUser & { passwordHash?: string }): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId,
    createdAt: user.createdAt,
  };
}

/** Ensures bootstrap superadmin exists when ADMIN_EMAILS is set. */
export async function ensureBootstrapAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAILS?.split(",")[0]?.trim();
  if (!email) return;
  const db = await readAuth();
  const normalized = normalizeEmail(email);
  if (db.users.some((u) => u.email === normalized)) return;

  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD || "moked-admin-change-me";
  db.users.push({
    id: nanoid(),
    email: normalized,
    name: "Super Admin",
    role: "superadmin",
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  });
  await writeAuth(db);
}

export async function registerOwner(input: {
  email: string;
  password: string;
  name: string;
  tenantId?: string;
}): Promise<AuthUser> {
  const db = await readAuth();
  const email = normalizeEmail(input.email);
  if (db.users.some((u) => u.email === email)) {
    throw new Error("email_taken");
  }
  const role = isAdminEmail(email) ? "superadmin" : "owner";
  const user = {
    id: nanoid(),
    email,
    name: input.name.trim() || email.split("@")[0],
    role: role as AuthUser["role"],
    tenantId: input.tenantId,
    passwordHash: hashPassword(input.password),
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  await writeAuth(db);
  return toPublic(user);
}

export async function authenticateLocal(
  email: string,
  password: string,
): Promise<AuthUser | null> {
  await ensureBootstrapAdmin();
  const db = await readAuth();
  const user = db.users.find((u) => u.email === normalizeEmail(email));
  if (!user) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  const publicUser = toPublic(user);
  if (isAdminEmail(publicUser.email)) {
    publicUser.role = "superadmin";
  }
  return publicUser;
}

export async function getUserById(id: string): Promise<AuthUser | null> {
  await ensureBootstrapAdmin();
  const db = await readAuth();
  const user = db.users.find((u) => u.id === id);
  if (!user) return null;
  const publicUser = toPublic(user);
  if (isAdminEmail(publicUser.email)) publicUser.role = "superadmin";
  return publicUser;
}

export async function listUsers(): Promise<AuthUser[]> {
  await ensureBootstrapAdmin();
  const db = await readAuth();
  return db.users.map((u) => {
    const pub = toPublic(u);
    if (isAdminEmail(pub.email)) pub.role = "superadmin";
    return pub;
  });
}

export async function linkUserToTenant(
  userId: string,
  tenantId: string,
): Promise<AuthUser> {
  const db = await readAuth();
  const idx = db.users.findIndex((u) => u.id === userId);
  if (idx < 0) throw new Error("user_not_found");
  db.users[idx].tenantId = tenantId;
  await writeAuth(db);
  return toPublic(db.users[idx]);
}
