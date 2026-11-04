import Link from "next/link";
import { ArrowLeftIcon, UserRoundIcon } from "./LandingIcons";
import { MokedBrand } from "./MokedBrand";

type LandingHeaderProps = {
  whatsappHref: string;
};

export function LandingHeader({ whatsappHref }: LandingHeaderProps) {
  return (
    <>
      <a className="skip-link" href="#main-content">
        דלג לתוכן הראשי
      </a>
      <header className="site-header">
        <div className="site-header__inner landing-shell">
          <MokedBrand />

          <nav aria-label="ניווט ראשי" className="site-nav">
            <a href="#how-it-works">איך זה עובד</a>
            <a href="#capabilities">מה מוקד עושה</a>
            <a href="#why-moked">למה מוקד</a>
          </nav>

          <div className="site-header__actions">
            <Link className="personal-area-link" href="/login?next=/dashboard">
              <UserRoundIcon />
              <span>כניסה לאזור האישי</span>
            </Link>
            <a
              className="button button--primary button--compact site-header__cta"
              href={whatsappHref}
              rel="noopener noreferrer"
              target="_blank"
            >
              בואו נדבר
              <ArrowLeftIcon />
            </a>
          </div>
        </div>
      </header>
    </>
  );
}
