"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/admin", label: "לקוחות" },
  { href: "/admin/prospects", label: "לידים" },
  { href: "/admin/numbers", label: "מספרים" },
];

export function SuperadminShell({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/gate", { method: "DELETE" });
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="admin-screen min-h-full">
      <header className="border-b border-white/20 bg-brand-deep text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-white">ניהול מוקד</p>
            <p className="text-sm text-white">{name}</p>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            {NAV.map((item) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-4 py-2 text-sm font-medium ${
                    active
                      ? "bg-white text-brand-deep"
                      : "border border-white/80 text-white hover:bg-white/15"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-full border border-white px-4 py-2 text-sm text-white"
            >
              יציאה
            </button>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
