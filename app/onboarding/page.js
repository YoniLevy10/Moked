"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [field, setField] = useState("אינסטלציה");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_business",
          name: name.trim() || "העסק שלי",
          field,
          phone: phone.trim() || null,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "שגיאה");
      setDone(data.business);
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="panel" style={{ maxWidth: 560, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>חיבור עסק</h1>
      <p className="muted">
        פיילוט מוקד — שכבת תפעול בוואטסאפ. אוטומטי בשגרה, אנושי בהחלטות. מנוי{" "}
        <strong>₪690</strong>/חודש.
      </p>

      {done ? (
        <div>
          <p>
            העסק <strong>{done.name}</strong> חובר בהצלחה.
          </p>
          <p className="muted">מזהה: {done.id}</p>
          <div className="row">
            <button className="btn" type="button" onClick={() => router.push("/")}>
              לדשבורד הסימולציה
            </button>
          </div>
          <div className="item" style={{ marginTop: "1rem" }}>
            <strong>WhatsApp חי (Meta)</strong>
            <p className="muted" style={{ marginBottom: 0 }}>
              צרו <code>.env.local</code> עם{" "}
              <code>WHATSAPP_TOKEN</code>, <code>WHATSAPP_PHONE_NUMBER_ID</code>,{" "}
              <code>WHATSAPP_VERIFY_TOKEN=moked_verify</code>
              <br />
              Webhook: <code>/api/whatsapp/webhook</code>
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="list">
          <label>
            שם העסק
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="לדוגמה: אינסטלציה כהן" />
          </label>
          <label>
            תחום
            <select value={field} onChange={(e) => setField(e.target.value)}>
              <option>אינסטלציה</option>
              <option>חשמל</option>
              <option>מיזוג</option>
              <option>ניקיון</option>
              <option>ניהול בניין</option>
              <option>אחר</option>
            </select>
          </label>
          <label>
            טלפון WhatsApp עסקי (אופציונלי)
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9725…" />
          </label>
          {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "מחבר…" : "חבר עסק והתחל"}
          </button>
        </form>
      )}
    </main>
  );
}
