"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Me = {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId?: string;
};

const OWNER_NAV = [
  { href: "/dashboard", label: "סקירה" },
  { href: "/dashboard/inbox", label: "תיבת שיחות" },
  { href: "/dashboard/processes", label: "תהליכים" },
  { href: "/dashboard/connections", label: "חיבורים" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) {
          router.replace("/login?next=/dashboard");
          return;
        }
        setMe(d.user);
      })
      .catch(() => undefined);
  }, [router]);

  async function logout() {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    router.push("/login");
  }

  const nav =
    me?.role === "superadmin"
      ? [...OWNER_NAV, { href: "/superadmin", label: "Superadmin" }]
      : OWNER_NAV;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <img src="/brand/moked-mark-green.png" alt="" width={28} height={28} />
          <img
            src="/brand/moked-logo-wordmark.png"
            alt="MOKED"
            height={24}
            style={{ height: 24, width: "auto" }}
          />
        </Link>
        <nav className="flex flex-wrap items-center gap-2">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full border border-line bg-white/60 px-4 py-2 text-sm font-medium transition hover:bg-white"
            >
              {item.label}
            </Link>
          ))}
          {me ? (
            <>
              <span className="hidden text-xs text-muted sm:inline">
                {me.name}
              </span>
              <button
                type="button"
                onClick={() => void logout()}
                className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white"
              >
                יציאה
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white"
            >
              כניסה
            </Link>
          )}
        </nav>
      </header>
      {children}
    </div>
  );
}
