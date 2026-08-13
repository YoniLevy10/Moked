import { MokedLogo } from "@/components/MokedLogo";

export default function Home() {
  return (
    <div className="relative flex min-h-full flex-col overflow-x-hidden bg-moked-paper">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <a href="#top" aria-label="MOKED — דף הבית" className="block">
            <MokedLogo
              variant="wordmark"
              priority
              className="h-9 w-auto sm:h-11"
            />
          </a>
          <a
            href="#contact"
            className="rounded-md bg-moked-green px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-moked-green-deep"
          >
            דברו איתנו
          </a>
        </div>
      </header>

      <main id="top" className="flex flex-1 flex-col">
        {/* Hero: one composition — brand + headline + CTA over full-bleed mark */}
        <section className="relative isolate flex min-h-[100svh] items-end overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(160deg,#eef5f0_0%,#f7faf8_42%,#dceee4_100%)]"
          />
          <div
            aria-hidden
            className="animate-drift pointer-events-none absolute inset-0 opacity-[0.9]"
          >
            <MokedLogo
              variant="mark"
              className="absolute -left-[18%] top-[8%] h-[92%] w-auto max-w-none object-contain opacity-[0.22] sm:-left-[8%] sm:opacity-[0.28] lg:left-auto lg:right-[-6%] lg:top-[4%] lg:h-[105%] lg:opacity-[0.34]"
              priority
            />
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_40%,transparent_0%,rgba(247,250,248,0.35)_55%,rgba(247,250,248,0.92)_100%)]"
          />

          <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-16 pt-28 sm:px-8 sm:pb-20 lg:pb-24">
            <div className="animate-rise max-w-2xl">
              <MokedLogo
                variant="wordmark"
                className="h-14 w-auto sm:h-16 md:h-[4.5rem]"
                priority
              />
            </div>

            <h1 className="animate-rise-delay font-display mt-8 max-w-2xl text-4xl font-extrabold leading-[1.12] tracking-tight text-moked-ink sm:text-5xl md:text-6xl">
              מוקד תפעול שסוגר קריאות
            </h1>

            <p className="animate-rise-delay-2 mt-5 max-w-xl text-lg leading-8 text-moked-muted sm:text-xl">
              קליטה, שיבוץ ומעקב במקום אחד — כדי שהצוות יעבוד מהר ועד סיום.
            </p>

            <div className="animate-rise-delay-2 mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#contact"
                className="rounded-md bg-moked-green px-6 py-3.5 text-base font-semibold text-white transition hover:bg-moked-green-deep"
              >
                התחילו עכשיו
              </a>
              <a
                href="#how"
                className="rounded-md px-5 py-3.5 text-base font-semibold text-moked-green-deep underline-offset-4 transition hover:underline"
              >
                איך זה עובד
              </a>
            </div>
          </div>
        </section>

        <section id="how" className="border-t border-moked-green/15 bg-white">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-16 sm:px-8 md:grid-cols-3 md:gap-10">
            {[
              {
                title: "קליטה חכמה",
                body: "כל פנייה נכנסת למקום אחד — עם הקשר מלא, בלי בלבול ובלי נפילות בין הכיסאות.",
              },
              {
                title: "שיבוץ מדויק",
                body: "התאמה מהירה למי שצריך לטפל — לפי זמינות, מיקום ועדיפות.",
              },
              {
                title: "סגירה בשקיפות",
                body: "מעקב חי עד שהקריאה נסגרת, עם תמונת מצב ברורה לצוות וללקוח.",
              },
            ].map((item) => (
              <article key={item.title} className="max-w-sm">
                <div className="mb-4 h-1 w-10 origin-right bg-moked-green" />
                <h2 className="font-display text-2xl font-bold text-moked-ink">
                  {item.title}
                </h2>
                <p className="mt-3 text-base leading-7 text-moked-muted">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="contact"
          className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8"
        >
          <div className="relative overflow-hidden bg-moked-green-deep px-6 py-12 text-white sm:px-12">
            <div
              aria-hidden
              className="pointer-events-none absolute -left-10 top-0 h-full w-1/2 opacity-20"
            >
              <MokedLogo
                variant="mark"
                className="absolute left-0 top-1/2 h-[140%] w-auto -translate-y-1/2 object-contain"
              />
            </div>
            <div className="relative">
              <h2 className="font-display max-w-xl text-3xl font-bold sm:text-4xl">
                מוכנים להעביר את המוקד לשליטה מלאה?
              </h2>
              <p className="mt-4 max-w-lg text-lg text-white/85">
                השאירו פרטים ונחזור אליכם עם הדגמה קצרה של MOKED.
              </p>
              <form className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row">
                <label className="sr-only" htmlFor="email">
                  אימייל
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="האימייל שלכם"
                  className="min-w-0 flex-1 rounded-md border-0 bg-white px-4 py-3.5 text-moked-ink outline-none ring-2 ring-transparent placeholder:text-moked-muted focus:ring-moked-green-soft"
                />
                <button
                  type="submit"
                  className="rounded-md bg-white px-6 py-3.5 font-semibold text-moked-green-deep transition hover:bg-moked-cream"
                >
                  שלחו לי פרטים
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 border-t border-moked-green/10 px-5 py-8 text-sm text-moked-muted sm:px-8">
        <MokedLogo variant="wordmark" className="h-8 w-auto opacity-90" />
        <p>© {new Date().getFullYear()} MOKED</p>
      </footer>
    </div>
  );
}
