"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

const PILOT_WA =
  process.env.NEXT_PUBLIC_PILOT_WHATSAPP || "972548102688";
const WA_LINK = `https://wa.me/${PILOT_WA}?text=${encodeURIComponent("שלום, אשמח לפיילוט מוקד")}`;

const FIELDS = [
  "אחזקה ושיפוצים",
  "קליניקה ומרפאה",
  "מוסך",
  "ניקיון",
  "אחר",
] as const;

type Visitor = { name: string; field: string; skip?: boolean };

export function LandingGate() {
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [name, setName] = useState("");
  const [field, setField] = useState<(typeof FIELDS)[number] | "">("");

  const canBuild = name.trim().length > 1 && Boolean(field);

  const biz = useMemo(() => {
    if (!visitor || visitor.skip) return "העסק שלך";
    return visitor.name;
  }, [visitor]);

  if (!visitor) {
    return (
      <div className="gate-shell">
        <div className="gate-card">
          <div className="gate-brand">
            <Image
              src="/brand/moked-mark-green.png"
              alt=""
              width={40}
              height={40}
              priority
            />
            <Image
              src="/brand/moked-logo-wordmark.png"
              alt="MOKED"
              width={140}
              height={36}
              priority
              className="wordmark"
            />
          </div>
          <h1>בוא נראה איך זה נראה אצלך.</h1>
          <p className="lede">
            שני פרטים, ואבנה לך דמו עם השם של העסק שלך בתוך ההודעות.
          </p>

          <label className="field">
            <span>שם העסק</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='לדוגמה: שירותי אחזקה כהן'
            />
          </label>

          <div className="field">
            <span>התחום</span>
            <div className="chips">
              {FIELDS.map((f) => (
                <button
                  key={f}
                  type="button"
                  className={field === f ? "chip on" : "chip"}
                  onClick={() => setField(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="cta"
            disabled={!canBuild}
            onClick={() =>
              setVisitor({ name: name.trim(), field: String(field) })
            }
          >
            בנה לי את הדמו
          </button>
          <button
            type="button"
            className="skip"
            onClick={() => setVisitor({ name: "", field: "", skip: true })}
          >
            רק מסתכל, דלג
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="demo-shell">
      <header className="nav">
        <div className="gate-brand">
          <Image
            src="/brand/moked-mark-green.png"
            alt=""
            width={36}
            height={36}
          />
          <Image
            src="/brand/moked-logo-wordmark.png"
            alt="MOKED"
            width={120}
            height={32}
            className="wordmark"
          />
        </div>
        <a className="cta small" href={WA_LINK} target="_blank" rel="noreferrer">
          לפיילוט
        </a>
      </header>

      <main className="hero">
        <p className="eyebrow">אוטומטי בשגרה · אנושי בהחלטות</p>
        <h1>
          מוקד — העסק שלך עובד
          <br />
          גם כשאתה לא עונה
        </h1>
        <p className="lede">
          {visitor.skip
            ? "שכבת תפעול בוואטסאפ: פנייה שלא נענתה הופכת לביקור ביומן."
            : `כך זה נראה אצל ${biz} ב${visitor.field}: שיחה שלא נענתה → מענה → שיבוץ.`}
        </p>

        <section className="chat" aria-label="דמו שיחה">
          <div className="bubble sys">
            היי, כאן המוקד של {biz}. פספסנו את השיחה שלך — במה אפשר לעזור?
          </div>
          <div className="bubble user">יש נזילה במטבח. אפשר להגיע היום?</div>
          <div className="bubble sys">
            כן. יש חלון פנוי היום בין 16:00 ל־18:00. מה הכתובת?
          </div>
          <div className="bubble user">רמב״ן 14, ירושלים</div>
          <div className="bubble sys">
            קבעתי ביקור ל־16:30. נעדכן כשהטכנאי יוצא אליך.
          </div>
        </section>

        <div className="actions">
          <Link className="cta" href="/onboarding">
            חברו את העסק למערכת
          </Link>
          <a
            className="cta secondary"
            href={WA_LINK}
            target="_blank"
            rel="noreferrer"
          >
            דברו איתנו ב־WhatsApp
          </a>
          <Link className="cta secondary" href="/dashboard">
            ללוח הבקרה
          </Link>
          <Link className="cta secondary" href="/login">
            כניסה למערכת
          </Link>
          <button type="button" className="skip" onClick={() => setVisitor(null)}>
            חזרה לשער
          </button>
        </div>
      </main>
    </div>
  );
}
