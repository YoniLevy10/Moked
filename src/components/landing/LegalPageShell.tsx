import Link from "next/link";
import { MokedBrand } from "./MokedBrand";

type LegalPageShellProps = {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
};

export function LegalPageShell({
  title,
  updatedAt,
  children,
}: LegalPageShellProps) {
  return (
    <div className="moked-landing legal-page">
      <header className="site-header">
        <div className="site-header__inner landing-shell">
          <MokedBrand />
          <nav aria-label="מסמכים משפטיים" className="site-nav">
            <Link href="/privacy">מדיניות פרטיות</Link>
            <Link href="/terms">תנאי שימוש</Link>
          </nav>
          <div className="site-header__actions">
            <Link className="personal-area-link" href="/">
              חזרה לדף הבית
            </Link>
          </div>
        </div>
      </header>

      <main className="legal-page__main landing-shell" id="main-content">
        <header className="legal-page__header">
          <p className="section-kicker">מסמך משפטי</p>
          <h1>{title}</h1>
          <p className="legal-page__meta">עודכן לאחרונה: {updatedAt}</p>
        </header>
        <article className="legal-page__body">{children}</article>
      </main>

      <footer className="site-footer">
        <div className="landing-shell site-footer__inner">
          <p className="site-footer__copyright">
            © {new Date().getFullYear()} מוקד. כל הזכויות שמורות.
          </p>
          <nav aria-label="קישורים משפטיים" className="site-footer__links">
            <Link href="/privacy">מדיניות פרטיות</Link>
            <Link href="/terms">תנאי שימוש</Link>
            <Link href="/">דף הבית</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
