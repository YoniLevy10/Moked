"use client";

import { FormEvent, useEffect, useState } from "react";

const fieldClass =
  "w-full rounded-2xl border border-line bg-white/80 px-4 py-3 outline-none ring-brand focus:ring-2";

export default function PolicyEditorPage() {
  const [answers, setAnswers] = useState({
    what: "",
    hours: "",
    forbidden: "",
    handoff: "",
    pasted: "",
  });
  const [draft, setDraft] = useState("");
  const [approved, setApproved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/bot/policy");
    const data = await res.json();
    if (!res.ok) {
      setError(data.message ?? data.error ?? "שגיאה");
      return;
    }
    setAnswers(data.answers);
    setDraft(data.draft ?? "");
    setApproved(data.approved ?? null);
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMsg(null);
    const res = await fetch("/api/bot/policy", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...answers, rewrite: true }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "שמירה נכשלה");
    else {
      setAnswers(data.answers);
      setDraft(data.draft ?? "");
      setMsg("מדיניות נשמרה");
    }
    setLoading(false);
  }

  async function approve() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/bot/approve", { method: "POST" });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "אישור נכשל");
    else {
      setMsg("הוראות אושרו");
      await load();
    }
    setLoading(false);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="display text-3xl font-bold">מדיניות סוכן</h1>
        <p className="mt-2 text-muted">
          עריכה לבעלים ול־Managed באותו נתיב{" "}
          <code className="text-xs">/api/bot/policy</code>.
        </p>
      </div>

      <form onSubmit={save} className="space-y-4">
        {(
          [
            ["what", "מה העסק עושה"],
            ["hours", "שעות"],
            ["forbidden", "אסור"],
            ["handoff", "העברה לאדם"],
            ["pasted", "הוראות חופשיות"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block space-y-2">
            <span className="text-sm font-medium">{label}</span>
            <textarea
              rows={key === "pasted" ? 4 : 2}
              className={fieldClass}
              value={answers[key]}
              onChange={(e) =>
                setAnswers((a) => ({ ...a, [key]: e.target.value }))
              }
            />
          </label>
        ))}
        <div className="flex flex-wrap gap-3">
          <button
            disabled={loading}
            className="rounded-full bg-brand px-5 py-3 font-semibold text-white disabled:opacity-60"
          >
            {loading ? "שומר..." : "שמור ונסח"}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void approve()}
            className="rounded-full border border-line px-5 py-3 font-semibold"
          >
            אשר הוראות
          </button>
        </div>
      </form>

      {draft ? (
        <section className="rounded-3xl border border-line bg-white/70 p-5">
          <h2 className="font-semibold">טיוטה</h2>
          <pre className="mt-3 whitespace-pre-wrap text-sm text-muted">{draft}</pre>
          {approved ? (
            <p className="mt-3 text-sm text-ok">מאושר</p>
          ) : (
            <p className="mt-3 text-sm text-danger">טרם אושר</p>
          )}
        </section>
      ) : null}

      {msg ? <p className="text-sm text-ok">{msg}</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
