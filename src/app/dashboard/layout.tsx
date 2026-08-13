import Link from "next/link";

const NAV = [
  { href: "/dashboard", label: "סקירה" },
  { href: "/dashboard/inbox", label: "תיבת שיחות" },
  { href: "/dashboard/processes", label: "תהליכים" },
  { href: "/dashboard/connections", label: "חיבורים" },
  { href: "/superadmin", label: "Superadmin" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <img src="/brand/moked-mark-black.png" alt="" width={28} height={28} />
          <img
            src="/brand/moked-logo-wordmark.png"
            alt="MOKED"
            height={24}
            style={{ height: 24, width: "auto" }}
          />
        </Link>
        <nav className="flex flex-wrap gap-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full border border-line bg-white/60 px-4 py-2 text-sm font-medium transition hover:bg-white"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white"
          >
            כניסה
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
