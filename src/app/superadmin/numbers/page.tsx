"use client";

import { FormEvent, useEffect, useState } from "react";
import { PhoneNumber } from "@/lib/types";

export default function NumbersPage() {
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [metaConfigured, setMetaConfigured] = useState(false);
  const [e164, setE164] = useState("");
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [names, setNames] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    const res = await fetch("/api/superadmin/numbers");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "שגיאה");
      return;
    }
    setNumbers(data.numbers ?? []);
    setMetaConfigured(Boolean(data.metaConfigured));
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function run(body: Record<string, string>) {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/superadmin/numbers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "שגיאה");
    await refresh();
    setLoading(false);
  }

  function add(e: FormEvent) {
    e.preventDefault();
    void run({ action: "add", e164 });
    setE164("");
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="display text-3xl font-bold">מאגר מספרים</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        המאגר ריק עד שמוסיפים לכאן מספרים שכבר נרכשו. רישום ל־Meta רץ רק כשמפתחות המערכת מוגדרים.
        {metaConfigured ? " Meta מוגדר." : " Meta עדיין לא מוגדר."}
      </p>

      <form onSubmit={add} className="mt-6 flex flex-wrap gap-2">
        <input
          value={e164}
          onChange={(e) => setE164(e.target.value)}
          placeholder="05..."
          className="rounded-full border border-line bg-white px-4 py-2 text-sm"
        />
        <button
          disabled={loading || e164.trim().length < 9}
          className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          הוספה למאגר
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      <div className="mt-6 space-y-2">
        {numbers.length === 0 && (
          <p className="text-sm text-muted">עדיין אין מספרים. שום מספר לא מומצא במקומם.</p>
        )}
        {numbers.map((phone) => (
          <div key={phone.id} className="rounded-2xl border border-line bg-white px-4 py-3">
            <p className="font-semibold">
              {phone.national} · {phone.status}
            </p>
            {phone.lastError && <p className="text-sm text-danger">{phone.lastError}</p>}
            {phone.status === "reserved" && (
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  value={names[phone.id] ?? phone.displayName}
                  onChange={(e) => setNames({ ...names, [phone.id]: e.target.value })}
                  placeholder="שם תצוגה ב־WhatsApp"
                  className="rounded-full border border-line px-3 py-1 text-sm"
                />
                <button
                  type="button"
                  className="text-sm text-brand underline"
                  onClick={() =>
                    void run({
                      action: "register",
                      id: phone.id,
                      displayName: names[phone.id] || phone.displayName || "מוקד",
                    })
                  }
                >
                  רשום ב־Meta
                </button>
              </div>
            )}
            {phone.status === "awaiting_code" && (
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  value={codes[phone.id] ?? ""}
                  onChange={(e) => setCodes({ ...codes, [phone.id]: e.target.value })}
                  placeholder="קוד SMS"
                  className="rounded-full border border-line px-3 py-1 text-sm"
                />
                <button
                  type="button"
                  className="text-sm text-brand underline"
                  onClick={() =>
                    void run({ action: "code", id: phone.id, code: codes[phone.id] ?? "" })
                  }
                >
                  אמת קוד
                </button>
              </div>
            )}
            {phone.status === "pending_name" && (
              <button
                type="button"
                className="mt-2 text-sm text-brand underline"
                onClick={() => void run({ action: "live", id: phone.id })}
              >
                סמן כחי אחרי אישור השם ב־Meta
              </button>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
