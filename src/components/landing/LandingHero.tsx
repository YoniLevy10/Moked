import { subscriptionPriceIls } from "@/lib/product/fees";
import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckIcon,
  MessageIcon,
} from "./LandingIcons";

type LandingHeroProps = {
  whatsappHref: string;
};

export function LandingHero({ whatsappHref }: LandingHeroProps) {
  const monthlyIls = subscriptionPriceIls();

  return (
    <section aria-labelledby="hero-title" className="hero-section">
      <div className="landing-shell hero-grid">
        <div className="hero-copy">
          <p className="landing-eyebrow">
            <span aria-hidden="true" className="landing-eyebrow__dot" />
            מערכת תפעול עסקית ב־WhatsApp
          </p>
          <h1 className="hero-title" id="hero-title">
            כל שיחה עם לקוח
            <br />
            <span>מקדמת את העסק.</span>
          </h1>
          <p className="hero-copy__body">
            מוקד הופכת שיחות WhatsApp לתהליך עבודה ברור: מקליטת הפנייה, דרך
            תיאום ומעקב, ועד לשירות שהלקוחות חוזרים אליו.
          </p>

          <div className="hero-actions">
            <a
              className="button button--primary button--large"
              href={whatsappHref}
              rel="noopener noreferrer"
              target="_blank"
            >
              לתיאום שיחת היכרות
              <ArrowLeftIcon />
            </a>
            <a className="button button--text" href="#how-it-works">
              איך זה עובד
            </a>
          </div>

          <p className="hero-caption">
            מנוי — {monthlyIls} ₪ לחודש
          </p>
          <p className="hero-caption">
            <span aria-hidden="true" className="hero-caption__mark" />
            פחות פניות שנופלות בין הכיסאות. יותר שליטה בעסק.
          </p>
        </div>

        <div className="hero-visual">
          <div aria-hidden="true" className="hero-visual__glow" />
          <div
            aria-label="המחשה של פנייה שמתקדמת לתיאום"
            className="workflow-card"
            role="group"
          >
            <div className="workflow-card__header">
              <div className="workflow-card__title">
                <span className="workflow-card__icon">
                  <MessageIcon />
                </span>
                <span className="workflow-card__labels">
                  <strong>פנייה חדשה</strong>
                  <span>תהליך לקוח לדוגמה</span>
                </span>
              </div>
              <span className="workflow-card__badge">דוגמה</span>
            </div>

            <div className="workflow-card__body">
              <div className="workflow-card__step-title">
                <strong>מהודעה לפעולה</strong>
                <span>הצעד הבא תמיד ברור</span>
              </div>
              <ol aria-label="שלבי התהליך" className="workflow-steps">
                <li className="workflow-step is-complete">
                  <span className="workflow-step__icon">
                    <CheckIcon />
                  </span>
                  <span>פנייה</span>
                </li>
                <li className="workflow-step is-complete">
                  <span className="workflow-step__icon">
                    <CheckIcon />
                  </span>
                  <span>תיאום</span>
                </li>
                <li className="workflow-step is-complete">
                  <span className="workflow-step__icon">
                    <CheckIcon />
                  </span>
                  <span>טיפול</span>
                </li>
              </ol>
            </div>

            <div aria-label="התכתבות לדוגמה" className="workflow-conversation" role="group">
              <p className="workflow-message workflow-message--customer">
                אפשר לתאם ביקור להיום?
              </p>
              <p className="workflow-message workflow-message--moked">
                נשאר חלון ב־16:30. מתאים?
              </p>
            </div>

            <div className="workflow-result">
              <span className="workflow-result__icon">
                <CalendarIcon />
              </span>
              <span className="workflow-result__content">
                <span>השלב הבא</span>
                <strong>ביקור נקבע</strong>
                <span>היום · 16:30</span>
              </span>
              <span aria-label="הושלם" className="workflow-result__check">
                <CheckIcon />
              </span>
            </div>
          </div>

          <div aria-hidden="true" className="hero-note">
            <span className="hero-note__icon">
              <CheckIcon />
            </span>
            <span>
              הפנייה מתועדת
              <strong>והתהליך ממשיך</strong>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
