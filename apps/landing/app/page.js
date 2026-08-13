"use client";

import { useEffect, useMemo, useState } from "react";

const PILOT_WA = "972548102688";
const WA_LINK = `https://wa.me/${PILOT_WA}?text=${encodeURIComponent("שלום, אשמח לפיילוט מוקד")}`;

const FLOWS = [
  { id: "lead", name: "ליד שלא נענה", blurb: "קולט פנייה, זמן וכתובת — ומעביר לבעלים." },
  { id: "quote", name: "הצעת מחיר", blurb: "מעקב אחרי הצעה; הנחה רק אחרי אישור אנושי." },
  { id: "reminder", name: "תזכורות", blurb: "תזכורת לפני ביקור או תשלום — בלי לרדוף." },
  { id: "collect", name: "גבייה", blurb: "תזכורות תשלום עדינות לפי מדיניות העסק." },
  { id: "dispatch", name: "שיבוץ", blurb: "משבץ עובד לפי זמינות וקרבה." },
  { id: "report", name: "דיווח", blurb: "סיכום ביצוע ללקוח ולעסק." },
  { id: "review", name: "ביקורת", blurb: "בקשת חוות דעת אחרי סיום." },
];

const FEED = [
  { t: "ליד חדש", d: "נזילה במטבח · ממתין לתיאום" },
  { t: "אישור הנחה", d: "הצעה ₪1,200 · ממתין לבעלים" },
  { t: "תזכורת", d: "ביקור מחר 10:00 נשלחה" },
];

const DEMO_LINES = [
  { who: "לקוח", text: "יש נזילה במטבח" },
  { who: "מוקד", text: "מתי נוח שנתאם ביקור?", tip: "כפתור: היום אחה״צ" },
  { who: "לקוח", text: "רמב״ן 14, ירושלים" },
  { who: "מוקד", text: "נפתח אישור לבעל העסק — אוטומטי בשגרה, אנושי בהחלטה." },
];

function Gate({ onEnter }) {
  const [name, setName] = useState("");
  const [field, setField] = useState("אינסטלציה");

  return (
    <div className="gate wrap">
      <div className="gate-card">
        <div className="brand" style={{ marginBottom: "0.4rem" }}>
          <img src="/moked-logo.svg" alt="" />
          <span>מוקד</span>
        </div>
        <h1>לפני שמתחילים</h1>
        <p>שכבת תפעול לעסק שלכם בוואטסאפ — לא עוד צ׳אטבוט כללי.</p>
        <div className="field">
          <span>שם העסק</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="לדוגמה: אינסטלציה כהן" />
        </div>
        <div className="field">
          <span>תחום</span>
          <select value={field} onChange={(e) => setField(e.target.value)}>
            <option>אינסטלציה</option>
            <option>חשמל</option>
            <option>מיזוג</option>
            <option>ניקיון</option>
            <option>ניהול בניין</option>
            <option>אחר</option>
          </select>
        </div>
        <div className="actions">
          <button
            className="cta"
            type="button"
            onClick={() => onEnter({ name: name.trim() || "העסק שלי", field })}
          >
            כניסה לדמו
          </button>
          <button className="cta ghost" type="button" onClick={() => onEnter({ name: "", field: "", skip: true })}>
            רק מסתכל/ת — דלג
          </button>
        </div>
      </div>
    </div>
  );
}

function LiveActivity() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 3200);
    return () => clearInterval(id);
  }, []);
  const items = useMemo(() => {
    const rotated = [...FEED.slice(tick % FEED.length), ...FEED].slice(0, 3);
    return rotated;
  }, [tick]);

  return (
    <div className="live-card">
      <h3>פעילות חיה עכשיו</h3>
      <div className="stats">
        <div className="stat">
          <b>7</b>
          <span>תהליכים</span>
        </div>
        <div className="stat">
          <b>1</b>
          <span>ממתין לאישור</span>
        </div>
        <div className="stat">
          <b>0</b>
          <span>חריגות</span>
        </div>
      </div>
      <div className="feed">
        {items.map((item, i) => (
          <div className="feed-item" key={`${item.t}-${tick}-${i}`}>
            <div>
              <em>{item.t}</em>
              <div style={{ color: "var(--muted)", marginTop: 2 }}>{item.d}</div>
            </div>
            <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>עכשיו</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Roi() {
  const [leads, setLeads] = useState(40);
  const [closeRate, setCloseRate] = useState(25);
  const [avg, setAvg] = useState(800);
  const savedHours = Math.round(leads * 0.35);
  const recovered = Math.round(leads * (closeRate / 100) * 0.15 * avg);
  const net = recovered - 690;

  return (
    <div className="roi">
      <h2>מחשבון ROI</h2>
      <p className="sub">כמה מחזירים לידים שלא נענו — מול מנוי ₪690 בחודש.</p>
      <div className="roi-grid">
        <div style={{ display: "grid", gap: "0.7rem" }}>
          <label>
            פניות בחודש
            <input type="number" min={5} value={leads} onChange={(e) => setLeads(Number(e.target.value) || 0)} />
          </label>
          <label>
            אחוז סגירה (%)
            <input
              type="number"
              min={1}
              max={100}
              value={closeRate}
              onChange={(e) => setCloseRate(Number(e.target.value) || 0)}
            />
          </label>
          <label>
            עסקה ממוצעת (₪)
            <input type="number" min={100} value={avg} onChange={(e) => setAvg(Number(e.target.value) || 0)} />
          </label>
        </div>
        <div className="roi-result">
          <span style={{ color: "#a7f3d0" }}>הערכה חודשית</span>
          <b>₪{Math.max(net, 0).toLocaleString("he-IL")}</b>
          <div style={{ color: "#cbd5e1", lineHeight: 1.5 }}>
            ~{savedHours} שעות תפעול נחסכות
            <br />
            הכנסה מוחזרת מלידים שאבדו ≈ ₪{recovered.toLocaleString("he-IL")}
            <br />
            אחרי עלות מנוי ₪690
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [visitor, setVisitor] = useState(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("moked_gate");
      if (raw) setVisitor(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  function enter(v) {
    setVisitor(v);
    try {
      sessionStorage.setItem("moked_gate", JSON.stringify(v));
    } catch {
      /* ignore */
    }
  }

  if (!visitor) {
    return (
      <>
        <nav className="nav wrap">
          <div className="brand">
            <img src="/moked-logo.svg" alt="מוקד" />
            <span>מוקד</span>
          </div>
          <a className="cta" href={WA_LINK} target="_blank" rel="noreferrer">
            פיילוט בוואטסאפ
          </a>
        </nav>
        <Gate onEnter={enter} />
      </>
    );
  }

  return (
    <>
      <nav className="nav wrap">
        <div className="brand">
          <img src="/moked-logo.svg" alt="מוקד" />
          <span>מוקד</span>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <a className="cta ghost" href="#flows">
            7 תהליכים
          </a>
          <a className="cta" href={WA_LINK} target="_blank" rel="noreferrer">
            התחלת פיילוט
          </a>
        </div>
      </nav>

      <header className="hero wrap">
        <div>
          <div className="principle">אוטומטי בשגרה · אנושי בהחלטות</div>
          <h1>
            מוקד
            <br />
            שכבת תפעול בוואטסאפ
          </h1>
          <p className="lede">
            {visitor.skip
              ? "לא צ׳אטבוט — שבעה תהליכים סגורים שמריצים את השגרה ומעבירים החלטות לבעל העסק."
              : `${visitor.name} ב${visitor.field}: מוקד מריץ לידים, הצעות, תזכורות וגבייה — ואתם מאשרים רק מה שחשוב.`}
          </p>
          <div className="hero-ctas">
            <a className="cta" href={WA_LINK} target="_blank" rel="noreferrer">
              דברו איתנו ב־WhatsApp
            </a>
            <a className="cta ghost" href="#demo">
              ראו דמו חי
            </a>
          </div>
        </div>
        <LiveActivity />
      </header>

      <section className="section wrap" id="flows">
        <h2>שבעה תהליכים. לא שיחה חופשית.</h2>
        <p className="sub">
          כל workflow סגור מקצה לקצה. השגרה רצה לבד; הנחה, מחיר ואישור בעלים — תמיד אנושיים.
        </p>
        <div className="flows">
          {FLOWS.map((f) => (
            <article className="flow" key={f.id}>
              <span className="tag">{f.id}</span>
              <h3 style={{ margin: 0 }}>{f.name}</h3>
              <p>{f.blurb}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section wrap" id="demo">
        <h2>דמו: ליד שלא נענה</h2>
        <p className="sub">אותו מסלול שבמערכת הסימולציה — «יש נזילה» → «היום אחה״צ» → כתובת.</p>
        <div className="demo">
          {DEMO_LINES.map((line, i) => (
            <div className="demo-line" key={i} style={{ animationDelay: `${i * 0.08}s` }}>
              <strong>{line.who}</strong>
              <span>{line.text}</span>
              {line.tip ? <span style={{ color: "#6ee7b7" }}>{line.tip}</span> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="section wrap">
        <Roi />
      </section>

      <section className="section wrap" style={{ textAlign: "center" }}>
        <h2>מוכנים לפיילוט?</h2>
        <p className="sub" style={{ marginInline: "auto" }}>
          מנוי ₪690 לחודש. מספר הפיילוט: {PILOT_WA}
        </p>
        <a className="cta" href={WA_LINK} target="_blank" rel="noreferrer">
          שלחו הודעה למוקד
        </a>
      </section>

      <footer className="footer wrap">
        <div className="brand">
          <img src="/moked-logo.svg" alt="" width={28} height={28} />
          <span>מוקד</span>
        </div>
        <div>אוטומטי בשגרה. אנושי בהחלטות.</div>
      </footer>
    </>
  );
}
