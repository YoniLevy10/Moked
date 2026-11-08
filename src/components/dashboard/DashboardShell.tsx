"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const OWNER_NAV = [
  { href: "/dashboard", label: "סקירה" },
  { href: "/dashboard/inbox", label: "תיבת שיחות" },
  { href: "/dashboard/knowledge", label: "ידע" },
  { href: "/dashboard/pricing", label: "מחירים" },
  { href: "/dashboard/policy", label: "מדיניות" },
  { href: "/dashboard/escalation", label: "הסלמה" },
  { href: "/dashboard/processes", label: "תהליכים" },
  { href: "/dashboard/connections", label: "חיבורים" },
  { href: "/dashboard/bot", label: "הבוט" },
  { href: "/onboarding", label: "הקמה מחדש" },
];

function isCurrent(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardShell({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function logout() {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    router.push("/login");
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6">
      <header className="mb-8 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <img src="/brand/moked-mark-green.png" alt="" width={28} height={28} />
          <img
            src="/brand/moked-logo-wordmark.png"
            alt="MOKED"
            height={24}
            style={{ height: 24, width: "auto" }}
          />
        </Link>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="owner-menu"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold"
        >
          <span className="flex w-4 flex-col gap-1" aria-hidden="true">
            <span className="h-0.5 w-full rounded-full bg-current" />
            <span className="h-0.5 w-full rounded-full bg-current" />
            <span className="h-0.5 w-full rounded-full bg-current" />
          </span>
          תפריט
        </button>
      </header>

      {open && (
        <nav
          id="owner-menu"
          aria-label="תפריט"
          className="mb-6 rounded-3xl border border-line bg-white p-3 shadow-lg"
        >
          <p className="px-3 pt-2 text-xs font-semibold text-muted-foreground">ניווט</p>
          <ul className="mt-1 space-y-1">
            {OWNER_NAV.map((item) => {
              const current = isCurrent(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={current ? "page" : undefined}
                    className={`block rounded-2xl px-4 py-3 text-sm font-medium ${
                      current ? "bg-brand text-white" : "bg-paper hover:bg-paper-2"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-2 border-t border-line px-3 pt-3 pb-2">
            <p className="text-xs font-semibold text-muted-foreground">חשבון</p>
            <p className="mt-1 text-sm font-semibold">{name}</p>
            <button
              type="button"
              onClick={() => void logout()}
              className="mt-3 w-full rounded-full bg-brand px-4 py-3 text-sm font-semibold text-white"
            >
              יציאה
            </button>
          </div>
        </nav>
      )}

      {children}
    </div>
  );
}
