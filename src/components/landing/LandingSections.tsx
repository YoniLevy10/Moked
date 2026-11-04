import Link from "next/link";
import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckIcon,
  ClipboardCheckIcon,
  MessageIcon,
  RepeatIcon,
  WorkflowIcon,
} from "./LandingIcons";
import { MokedBrand } from "./MokedBrand";

const processSteps = [
  {
    number: "01",
    icon: MessageIcon,
    title: "קולטים כל פנייה",
    description:
      "כל שיחה מקבלת מקום מסודר, יחד עם פרטי הלקוח והסיבה שפנה.",
  },
  {
    number: "02",
    icon: WorkflowIcon,
    title: "מקדמים את הטיפול",
    description:
      "סינון, תיאום ותזכורות נשארים ברצף אחד — בלי לרדוף בין הודעות.",
  },
  {
    number: "03",
    icon: CheckIcon,
    title: "סוגרים מעגל",
    description:
      "מעקב אחרי תור, הצעה ותשלום עוזר לראות מה הושלם ומה עוד פתוח.",
  },
];

const capabilities = [
  {
    icon: MessageIcon,
    title: "מענה ותיעוד",
    description:
      "פרטי הלקוח וסטטוס הטיפול נשארים מחוברים לשיחה, בלי לחפש שוב בשרשור.",
  },
  {
    icon: CalendarIcon,
    title: "יומן ותיאום",
    description:
      "תורים, חלונות זמן ותזכורות שממשיכים את השיחה אל השלב הבא.",
  },
  {
    icon: ClipboardCheckIcon,
    title: "הצעות ומעקב",
    description:
      "המשך מסודר מההתעניינות להצעה, ולמעקב אחר מה שצריך לקרות אחריה.",
  },
  {
    icon: RepeatIcon,
    title: "לקוחות חוזרים",
    description:
      "ההקשר נשמר, והפנייה הבאה מתחילה במקום הנכון — עם היסטוריה מסודרת.",
  },
];

const operatingPrinciples = [
  "פנייה, לקוח ומשימה נשארים מחוברים",
  "הצעד הבא ברור, גם כשהיום עמוס",
  "רואים מה עדיין פתוח ומה כבר הושלם",
];

export function LandingProcessSection() {
  return (
    <section
      aria-labelledby="how-it-works-title"
      className="process-section landing-section"
      id="how-it-works"
    >
      <div className="landing-shell">
        <div className="section-heading">
          <p className="section-kicker">איך זה עובד</p>
          <h2 id="how-it-works-title">
            פחות מרדף אחרי הודעות.
            <br />
            יותר עבודה שמתקדמת.
          </h2>
          <p className="section-heading__copy">
            הלקוח שולח הודעה. מכאן, כל צעד נרשם ומקבל המשך ברור — עד לסגירת
            המעגל.
          </p>
        </div>

        <ol className="process-grid">
          {processSteps.map((step) => {
            const Icon = step.icon;

            return (
              <li className="process-card" key={step.number}>
                <div className="process-card__top">
                  <span className="process-card__number">{step.number}</span>
                  <span className="process-card__icon">
                    <Icon />
                  </span>
                </div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </li>
            );
          })}
        </ol>

        <ul aria-label="היתרונות של מוקד" className="value-grid">
          <li>
            <strong>לא רק הודעות</strong>
            <span>כל פנייה מחוברת לתהליך</span>
          </li>
          <li>
            <strong>השלב הבא ברור</strong>
            <span>פחות דברים שנופלים בין הכיסאות</span>
          </li>
          <li>
            <strong>יותר שליטה</strong>
            <span>תמונה מסודרת של מה שקורה בעסק</span>
          </li>
        </ul>
      </div>
    </section>
  );
}

export function LandingCapabilitiesSection() {
  return (
    <section
      aria-labelledby="capabilities-title"
      className="capabilities-section landing-section"
      id="capabilities"
    >
      <div className="landing-shell">
        <div className="capabilities-heading">
          <div>
            <p className="section-kicker">תהליך אחד, מקצה לקצה</p>
            <h2 id="capabilities-title">
              התהליך לא נעצר
              <br />
              במענה.
            </h2>
          </div>
          <p className="capabilities-heading__copy">
            מוקד מרכזת את העבודה שמתחילה בשיחה — כדי שתוכלו לנהל פניות, תיאומים
            והמשך טיפול מתוך תמונה אחת.
          </p>
        </div>

        <ul className="capabilities-grid">
          {capabilities.map((capability) => {
            const Icon = capability.icon;

            return (
              <li className="capability-card" key={capability.title}>
                <span className="capability-card__icon">
                  <Icon />
                </span>
                <h3>{capability.title}</h3>
                <p>{capability.description}</p>
                <span aria-hidden="true" className="capability-card__line" />
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export function LandingWhySection() {
  return (
    <section
      aria-labelledby="why-moked-title"
      className="why-section"
      id="why-moked"
    >
      <div className="landing-shell why-grid">
        <div className="why-copy">
          <p className="section-kicker section-kicker--light">מעבר לצ׳אט</p>
          <h2 id="why-moked-title">
            לא רק לענות.
            <br />
            <span>לדאוג שהדברים יקרו.</span>
          </h2>
          <p className="why-copy__body">
            צ׳אט יודע להשיב. עסק צריך לנהל אחריות, תיאום, מעקב וסגירה. מוקד
            בנויה סביב התהליך העסקי שמתחיל אחרי ההודעה.
          </p>
        </div>

        <div className="why-panel">
          <p className="why-panel__eyebrow">איך זה מרגיש ביום־יום</p>
          <ul className="why-list">
            {operatingPrinciples.map((principle) => (
              <li key={principle}>
                <span className="why-list__check">
                  <CheckIcon />
                </span>
                <span>{principle}</span>
              </li>
            ))}
          </ul>
          <div aria-hidden="true" className="why-flow">
            <span>פנייה</span>
            <ArrowLeftIcon />
            <span>פעולה</span>
            <ArrowLeftIcon />
            <strong>תוצאה</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

type LandingContactSectionProps = {
  whatsappHref: string;
};

export function LandingContactSection({
  whatsappHref,
}: LandingContactSectionProps) {
  return (
    <section
      aria-labelledby="contact-title"
      className="contact-section"
      id="contact"
    >
      <div className="landing-shell">
        <div className="contact-panel">
          <div className="contact-copy">
            <p className="section-kicker">נתחיל בשיחה</p>
            <h2 id="contact-title">יש לכם תהליך שרוצים לייעל?</h2>
            <p>
              ספרו לנו איך העסק עובד היום, ונחשוב יחד איך להפוך את הפניות
              לתהליך ברור יותר.
            </p>
          </div>
          <a
            className="button button--primary button--large"
            href={whatsappHref}
            rel="noopener noreferrer"
            target="_blank"
          >
            ספרו לנו על העסק שלכם
            <ArrowLeftIcon />
          </a>
        </div>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="site-footer">
      <div className="landing-shell site-footer__inner">
        <div className="site-footer__brand">
          <MokedBrand />
          <p>תפעול עסקי שמתחיל בשיחה וממשיך לתוצאה.</p>
        </div>

        <nav aria-label="ניווט תחתון" className="site-footer__links">
          <a href="#how-it-works">איך זה עובד</a>
          <a href="#capabilities">מה מוקד עושה</a>
          <a href="#contact">דברו איתנו</a>
          <Link href="/login?next=/dashboard">כניסה לאזור האישי</Link>
        </nav>

        <p className="site-footer__copyright">
          © {new Date().getFullYear()} מוקד. כל הזכויות שמורות.
        </p>
      </div>
    </footer>
  );
}
