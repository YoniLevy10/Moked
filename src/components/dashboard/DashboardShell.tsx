"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

const OWNER_NAV = [
  { href: "/dashboard", label: "סקירה" },
  { href: "/dashboard/inbox", label: "תיבת שיחות" },
  { href: "/dashboard/processes", label: "תהליכים" },
  { href: "/dashboard/connections", label: "חיבורים" },
  { href: "/dashboard/bot", label: "הבוט" },
];

export function DashboardShell({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

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
          {OWNER_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full border border-line bg-white/60 px-4 py-2 text-sm font-medium transition hover:bg-white"
            >
              {item.label}
            </Link>
          ))}
          <span className="hidden text-xs text-muted sm:inline">{name}</span>
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white"
          >
            יציאה
          </button>
        </nav>
      </header>
      {children}
    </div>
  );
}
