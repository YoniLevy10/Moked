import Link from "next/link";

const NAV = [
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
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <Link href="/" className="display text-2xl font-extrabold text-brand-deep">
          MOKED
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
        </nav>
      </header>
      {children}
    </div>
  );
}
