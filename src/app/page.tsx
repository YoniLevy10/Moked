import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative flex-1 overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-brand/20 blur-3xl animate-pulse-soft" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <img src="/brand/moked-mark-green.png" alt="" width={32} height={32} />
          <img src="/brand/moked-logo-wordmark.png" alt="MOKED" height={28} style={{height:28,width:"auto"}} />
        </div>
        <Link
          href="/onboarding"
          className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-deep"
        >
          התחל עכשיו
        </Link>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[78vh] w-full max-w-6xl flex-col justify-center px-6 pb-16 pt-8">
        <p className="animate-rise display mb-4 text-5xl font-extrabold leading-none text-brand-deep sm:text-7xl md:text-8xl">
          MOKED
        </p>
        <h1 className="animate-rise-delay max-w-3xl text-3xl font-bold leading-tight text-ink sm:text-5xl">
          חבר את הוואטסאפ.
          <span className="block text-brand">אנחנו סוגרים את התהליכים.</span>
        </h1>
        <p className="animate-rise-delay mt-6 max-w-xl text-lg leading-relaxed text-muted">
          לעצמאים בישראל — חיבור Cloud API בלחיצה, בלי BSP ובלי סיבוכים. קליטה,
          סינון, תורים, תזכורות, שימור, הצעות וגבייה — לפי סדר הגלים.
        </p>
        <div className="animate-rise-delay mt-10 flex flex-wrap items-center gap-4">
          <Link
            href="/onboarding"
            className="rounded-full bg-ink px-7 py-3.5 text-base font-semibold text-white transition hover:bg-brand-deep"
          >
            חבר WhatsApp בלחיצה
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full border border-line bg-white/60 px-7 py-3.5 text-base font-semibold text-ink backdrop-blur transition hover:bg-white"
          >
            ללוח הבקרה
          </Link>
        </div>
      </section>

      <section className="relative z-10 border-t border-line bg-white/40">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:grid-cols-3">
          {[
            {
              title: "גל A — מהיר על Meta",
              body: "קליטה, סינון ליד ותיאום תור — בלי ספקים חיצוניים.",
            },
            {
              title: "גל B/C — תבניות ותוכן",
              body: "תזכורות, ביקורות והצעות מחיר כשהליבה כבר חיה.",
            },
            {
              title: "גל D — גבייה בסוף",
              body: "סליקה וחשבוניות ישראליות רק אחרי שיש ערך מוכח.",
            },
          ].map((item) => (
            <div key={item.title}>
              <h2 className="display text-xl font-bold text-brand-deep">
                {item.title}
              </h2>
              <p className="mt-3 text-muted leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
