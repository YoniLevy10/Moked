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
    <div className="min-h-full bg-brand-deep/5">
      <header className="border-b border-line bg-brand-deep text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-white/70">ניהול מוקד</p>
            <p className="text-sm">{name}</p>
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
                    active ? "bg-white text-brand-deep" : "text-white/80 hover:bg-white/10"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-full border border-white/30 px-4 py-2 text-sm"
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
